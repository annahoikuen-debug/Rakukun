"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signupSchema } from "@/lib/validators";
import { provisionOrgGophishUser } from "@/lib/org";
import { assertEmailMatchesTenant, emailDomain } from "@/lib/domain-guard";
import { redirect } from "next/navigation";

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
    orgName: formData.get("orgName"),
  });
  if (!parsed.success) return { error: "Invalid input" };
  const { email, password, name, orgName } = parsed.data;

  const domainErr = assertEmailMatchesTenant(email, null);
  if (domainErr) return { error: domainErr };

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return { error: "Email already registered" };

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await prisma.user.create({
      data: { email: email.toLowerCase(), name, passwordHash },
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
  await prisma.membership.create({
    data: { userId: user.id, tenantId: org.id, role: "OWNER" },
  });

  // provision gophish user (best-effort; don't block signup on failure)
  try {
    await provisionOrgGophishUser(org.id);
  } catch (e) {
    console.error("gophish provisioning failed:", e);
  }

  redirect("/signin");
}