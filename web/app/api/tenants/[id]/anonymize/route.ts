import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { toOrgErrorStatus, toClientMessage } from "@/lib/errors";
import { auditLog } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;

  let org, membership;
  try {
    const r = await requireOrg(userId, id);
    org = r.org;
    membership = r.membership;
  } catch (e) {
    return NextResponse.json({ error: toClientMessage(e) }, { status: toOrgErrorStatus(e) });
  }
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Anonymize target employee PII for this tenant.
  const employees = await prisma.targetEmployee.findMany({ where: { tenantId: org.id } });
  let count = 0;
  for (const e of employees) {
    await prisma.targetEmployee.update({
      where: { id: e.id },
      data: {
        name: "匿名",
        email: `anon-${e.id}@deleted.local`,
        department: "匿名",
      },
    });
    count++;
  }

  await auditLog({
    userId,
    userEmail: session.user?.email ?? undefined,
    action: "tenant.anonymize",
    entityType: "Tenant",
    entityId: org.id,
    metadata: { anonymized: count },
    tenantId: org.id,
    severity: "high",
  }).catch(() => {});

  return NextResponse.json({ ok: true, anonymized: count });
}