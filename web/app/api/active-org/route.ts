import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveOrgCookie } from "@/lib/org";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return NextResponse.redirect(new URL("/signin", req.url));
  const userId = session.userId as string;
  const form = await req.formData();
  const orgId = String(form.get("orgId") ?? "");
  const m = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId: orgId } },
  });
  if (!m) return NextResponse.redirect(new URL("/dashboard", req.url));
  await setActiveOrgCookie(orgId);

  await auditLog({
    userId,
    userEmail: session.user?.email ?? undefined,
    action: "tenant.switch",
    entityType: "Tenant",
    entityId: orgId,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
    tenantId: orgId,
  }).catch(() => {});

  return NextResponse.redirect(new URL("/dashboard", req.url));
}