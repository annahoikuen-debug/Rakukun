import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { toOrgErrorStatus } from "@/lib/errors";
import { auditLog } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const userAgent = req.headers.get("user-agent") ?? undefined;
  let org, membership;
  try {
    const r = await requireOrg(userId, id);
    org = r.org;
    membership = r.membership;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: toOrgErrorStatus(e) });
  }
  if (membership.role === "MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employees = await prisma.targetEmployee.findMany({ where: { tenantId: org.id } });
  await prisma.$transaction(
    employees.map((e, idx) =>
      prisma.targetEmployee.update({
        where: { id: e.id },
        data: { name: `利用者${idx + 1}`, email: `anon${idx + 1}.${e.id}@anonymized.invalid` },
      }),
    ),
  );

  // Reflect anonymization in Gophish: empty the tenant group targets so real
  // emails/first names no longer persist in Gophish for future sends.
  let client;
  try {
    client = await orgClient(org.id);
  } catch {
    return NextResponse.json({ anonymized: employees.length, gophish: "not provisioned" });
  }
  try {
    const groups = await client.getGroups();
    const group = (groups as any[]).find((g) => g.name === `tenant-${org.id}-employees`);
    if (group) {
      await client.updateGroup(group.id, {
        name: `tenant-${org.id}-employees`,
        targets: [],
      });
    }
  } catch (e) {
    console.error("anonymize: gophish group clear failed", e);
    await auditLog({
      userId,
      userEmail: session.user?.email ?? undefined,
      action: "tenant.anonymize",
      entityType: "Tenant",
      entityId: org.id,
      metadata: { anonymized: employees.length, gophish: "failed" },
      ip,
      userAgent,
      tenantId: org.id,
    }).catch(() => {});
    return NextResponse.json({
      anonymized: employees.length,
      gophish: "local anonymized; failed to clear Gophish targets",
    });
  }

  await auditLog({
    userId,
    userEmail: session.user?.email ?? undefined,
    action: "tenant.anonymize",
    entityType: "Tenant",
    entityId: org.id,
    metadata: { anonymized: employees.length, gophish: "cleared" },
    ip,
    userAgent,
    tenantId: org.id,
  }).catch(() => {});

  return NextResponse.json({ anonymized: employees.length, gophish: "targets cleared" });
}