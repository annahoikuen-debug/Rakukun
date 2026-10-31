import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveOrgId } from "@/lib/org";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.userId) redirect("/signin");
  const userId = session.userId as string;
  const orgId = await getActiveOrgId(userId);
  const org = orgId ? await prisma.tenant.findUnique({ where: { id: orgId } }) : null;
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { tenant: true },
  });

  // MFA enforcement: OWNER/ADMIN of the active org must enable MFA.
  const activeMembership = memberships.find((m) => m.tenantId === orgId);
  const role = activeMembership?.role;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true } });
  if ((role === "OWNER" || role === "ADMIN") && !user?.mfaEnabled) {
    redirect("/mfa-required");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r p-4 space-y-2">
        <div className="font-bold mb-4">Rakukun</div>
        <div className="text-xs text-gray-500 mb-2">{org?.name ?? "No org"}</div>
        {memberships.length > 1 && (
          <form action="/api/active-org" method="post" className="mb-4">
            <select name="orgId" defaultValue={orgId ?? ""} className="border p-1 text-sm w-full">
              {memberships.map((m:any) => (
                <option key={m.tenantId} value={m.tenantId}>{m.tenant.name}</option>
              ))}
            </select>
            <button className="text-xs underline mt-1">Switch</button>
          </form>
        )}
        <nav className="space-y-1 text-sm">
          <Link href="/dashboard" className="block hover:underline">Dashboard</Link>
          <Link href="/dashboard/campaigns" className="block hover:underline">Campaigns</Link>
          <Link href="/dashboard/templates" className="block hover:underline">Templates</Link>
          <Link href="/dashboard/pages" className="block hover:underline">Landing Pages</Link>
          <Link href="/dashboard/groups" className="block hover:underline">Groups</Link>
          <Link href="/dashboard/sending-profiles" className="block hover:underline">Sending Profiles</Link>
          <Link href="/dashboard/onboarding" className="block hover:underline">Onboarding (3-step)</Link>
          <Link href="/dashboard/settings" className="block hover:underline">Settings</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}