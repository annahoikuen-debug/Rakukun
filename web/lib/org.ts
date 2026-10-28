import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { adminClient } from "./gophish";
import { encrypt } from "./crypto";
import { randomBytes } from "crypto";
import { OrgAccessError } from "./errors";
import { OrgRole } from "@prisma/client";

export async function getActiveOrgId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieName = process.env.ACTIVE_ORG_COOKIE ?? "active_org_id";
  const fromCookie = cookieStore.get(cookieName)?.value;
  if (fromCookie) {
    const m = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId: fromCookie } },
    });
    if (m) return fromCookie;
  }
  const first = await prisma.membership.findFirst({ where: { userId } });
  return first?.tenantId ?? null;
}

export async function requireOrg(userId: string, orgId?: string) {
  const id = orgId ?? (await getActiveOrgId(userId));
  if (!id) throw new OrgAccessError("No tenant selected", 400);
  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId: id } },
  });
  if (!membership) throw new OrgAccessError("Not a member of this tenant", 403);
  const org = await prisma.tenant.findUnique({ where: { id } });
  if (!org) throw new OrgAccessError("Tenant not found", 404);
  return { org, membership };
}

export async function provisionOrgGophishUser(orgId: string) {
  const client = adminClient();
  const username = `org_${orgId}`;
  const password = randomBytes(32).toString("hex");
  const created = (await client.createUser({
    username,
    password,
    role: "user",
    password_change_required: false,
    account_locked: false,
  })) as { id?: number; api_key?: string };
  const apiKey = created?.api_key ?? "";
  if (!apiKey) throw new Error("Gophish did not return an API key");
  await prisma.tenant.update({
    where: { id: orgId },
    data: { gophishUserId: created?.id ?? null, gophishApiKey: encrypt(apiKey) },
  });
  return { username, gophishUserId: created?.id };
}

export async function setActiveOrgCookie(orgId: string) {
  const cookieStore = await cookies();
  const cookieName = process.env.ACTIVE_ORG_COOKIE ?? "active_org_id";
  cookieStore.set(cookieName, orgId, { httpOnly: true, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

export { OrgRole };