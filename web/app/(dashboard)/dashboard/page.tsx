import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.userId as string;
  const memberships = await prisma.membership.count({ where: { userId } });
  const orgs = await prisma.tenant.count({ where: { memberships: { some: { userId } } } });
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p>Tenants: {orgs} · Memberships: {memberships}</p>
      <p className="mt-2 text-sm text-gray-500">Use the sidebar to manage campaigns, templates, landing pages, groups, and sending profiles.</p>
    </div>
  );
}