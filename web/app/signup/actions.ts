"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signupSchema } from "@/lib/validators";
import { provisionOrgGophishUser } from "@/lib/org";
import { assertEmailMatchesTenant, emailDomain } from "@/lib/domain-guard";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";

export async function signupAction(_prevState: unknown, formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
    orgName: formData.get("orgName"),
  });
  if (!parsed.success) return { error: "Invalid input" };
  const { email, password, name, orgName } = parsed.data;
  const emailLower = email.toLowerCase();

  // Rate-limit signup attempts by email to prevent Gophish-user resource exhaustion.
  if (!rateLimit(`signup:${emailLower}`, 3, 60_000)) {
    return { error: "サインアップ試行回数を超えました。しばらくしてから再試行してください。" };
  }

  const domainErr = assertEmailMatchesTenant(email, null);
  if (domainErr) return { error: domainErr };

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) return { error: "Email already registered" };

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await prisma.user.create({
      data: { email: emailLower, name, passwordHash },
    });
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Email already registered" };
    throw e;
  }

  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + user.id.slice(0, 6);
  let org;
  try {
    org = await prisma.tenant.create({
      data: { name: orgName, slug, domain: emailDomain(email), plan: "FREE" },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // clean up the orphan user before failing
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      return { error: "このドメインは既に登録されています。管理者に招待を依頼してください。" };
    }
    throw e;
  }
  try {
    await prisma.membership.create({
      data: { userId: user.id, tenantId: org.id, role: "OWNER" },
    });
  } catch (e) {
    // Don't leave an orphan user that would block re-signup.
    console.error("membership create failed, rolling back user", e);
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    throw e;
  }

  // provision gophish user (best-effort; don't block signup on failure)
  try {
    await provisionOrgGophishUser(org.id);
  } catch (e) {
    console.error("gophish provisioning failed:", e);
  }

  redirect("/signin");
}