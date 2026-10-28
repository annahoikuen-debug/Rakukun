import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveOrgCookie } from "@/lib/org";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) redirect("/signin");
  const userId = session.userId as string;
  const form = await req.formData();
  const orgId = String(form.get("orgId") ?? "");
  const m = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId: orgId } },
  });
  if (!m) redirect("/dashboard");
  await setActiveOrgCookie(orgId);
  redirect("/dashboard");
}