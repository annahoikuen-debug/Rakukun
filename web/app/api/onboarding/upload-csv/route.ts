import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { assertEmailMatchesTenant, planLimit } from "@/lib/domain-guard";
import { toOrgErrorStatus } from "@/lib/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

const emailSchema = z.string().email();

// Minimal CSV field splitter that respects double-quoted fields.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const orgId = await (await import("@/lib/org")).getActiveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
  let org, client;
  try {
    const r = await requireOrg(userId, orgId);
    org = r.org;
    client = await orgClient(r.org.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: toOrgErrorStatus(e) });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 2_000_000) return NextResponse.json({ error: "ファイルが大きすぎます（最大2MB）" }, { status: 400 });

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // Header row = first line contains no "@" in any column.
  const isHeader = lines.length > 0 && !lines.some((l) => l.includes("@"));
  const dataLines = isHeader ? lines.slice(1) : lines;

  const employees: { department: string; name: string; email: string }[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const line of dataLines) {
    const cols = splitCsvLine(line);
    if (cols.length < 3) continue;
    const [department, name, email] = cols;
    if (!email) continue;
    if (!emailSchema.safeParse(email).success) { errors.push(`${email}: メール形式が不正`); continue; }
    const domainErr = assertEmailMatchesTenant(email, org.domain);
    if (domainErr) { errors.push(`${email}: ${domainErr}`); continue; }
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    employees.push({ department, name, email });
  }

  if (errors.length) return NextResponse.json({ error: "登録エラー", details: errors.slice(0, 20) }, { status: 400 });

  const groupName = `tenant-${org.id}-employees`;
  const limit = planLimit(org.plan);

  let result: { created: number; updated: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      // Re-check plan limit inside the transaction to close the TOCTOU gap.
      const existingRows = await tx.targetEmployee.findMany({
        where: { tenantId: org.id, email: { in: employees.map((e) => e.email.toLowerCase()) } },
        select: { email: true },
      });
      const existingSet = new Set(existingRows.map((r) => r.email.toLowerCase()));
      const newCount = employees.filter((e) => !existingSet.has(e.email.toLowerCase())).length;
      const totalForTenant = await tx.targetEmployee.count({ where: { tenantId: org.id } });
      if (totalForTenant + newCount > limit) {
        throw new Error(`LIMIT:${limit}`);
      }
      let created = 0;
      let updated = 0;
      for (const e of employees) {
        const emailLower = e.email.toLowerCase();
        const found = await tx.targetEmployee.findUnique({
          where: { tenantId_email: { tenantId: org.id, email: emailLower } },
        });
        await tx.targetEmployee.upsert({
          where: { tenantId_email: { tenantId: org.id, email: emailLower } },
          update: { department: e.department, name: e.name },
          create: { tenantId: org.id, department: e.department, name: e.name, email: emailLower },
        });
        if (found) updated++;
        else created++;
      }
      return { created, updated };
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.startsWith("LIMIT:")) {
      return NextResponse.json({ error: `プラン上限（${msg.slice(6)}名）を超えています` }, { status: 400 });
    }
    console.error("employee upsert failed", e);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  // Reuse existing group if present (Gophish returns 409 on duplicate name).
  let group: any;
  try {
    group = await client.createGroup({
      name: groupName,
      targets: employees.map((e) => ({
        email: e.email.toLowerCase(),
        first_name: e.name,
        last_name: "",
        position: e.department,
      })),
    });
  } catch (e: any) {
    // Duplicate name — fetch the existing group and update its targets instead.
    try {
      const groups = await client.getGroups();
      const existing = (groups as any[]).find((g) => g.name === groupName);
      if (existing) {
        group = await client.updateGroup(existing.id, {
          name: groupName,
          targets: employees.map((e) => ({
            email: e.email.toLowerCase(),
            first_name: e.name,
            last_name: "",
            position: e.department,
          })),
        });
      } else {
        console.error("createGroup failed (not a duplicate):", e);
        return NextResponse.json(
          { error: "Gophish グループ作成に失敗しました（社員は保存済み）", count: employees.length },
          { status: 502 },
        );
      }
    } catch (e2) {
      console.error("updateGroup failed:", e2);
      return NextResponse.json(
        { error: "Gophish グループ更新に失敗しました（社員は保存済み）", count: employees.length },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ groupId: group?.id, groupName, count: employees.length, ...result });
}