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

  // Plan limit: count only NEW emails (existing ones will be updated, not added).
  const existingRows = await prisma.targetEmployee.findMany({
    where: { tenantId: org.id, email: { in: employees.map((e) => e.email) } },
    select: { email: true },
  });
  const existingSet = new Set(existingRows.map((r) => r.email.toLowerCase()));
  const newCount = employees.filter((e) => !existingSet.has(e.email.toLowerCase())).length;
  const totalForTenant = await prisma.targetEmployee.count({ where: { tenantId: org.id } });
  if (totalForTenant + newCount > planLimit(org.plan)) {
    return NextResponse.json({ error: `プラン上限（${planLimit(org.plan)}名）を超えています` }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      employees.map((e) =>
        prisma.targetEmployee.upsert({
          where: { tenantId_email: { tenantId: org.id, email: e.email } },
          update: { department: e.department, name: e.name },
          create: { tenantId: org.id, department: e.department, name: e.name, email: e.email },
        }),
      ),
    );
  } catch (e) {
    console.error("employee upsert failed", e);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  const group = await client.createGroup({
    name: `tenant-${org.id}-employees`,
    targets: employees.map((e) => ({
      email: e.email,
      first_name: e.name,
      last_name: "",
      position: e.department,
    })),
  });

  return NextResponse.json({ groupId: (group as any)?.id, count: employees.length });
}