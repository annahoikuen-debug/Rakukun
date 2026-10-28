import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.userId as string;
  const { org } = await requireOrg(userId);
  const members = await prisma.membership.findMany({
    where: { tenantId: org.id },
    include: { user: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>
      <div className="mb-4">
        <p><strong>Tenant:</strong> {org.name}</p>
        <p><strong>Slug:</strong> {org.slug}</p>
        <p><strong>Gophish user id:</strong> {org.gophishUserId ?? "not provisioned"}</p>
        <p><strong>Gophish API key:</strong> {org.gophishApiKey ? "configured" : "missing"}</p>
      </div>
      <h2 className="font-semibold mb-2">Members</h2>
      <ul className="space-y-1">
        {members.map((m:any) => (
          <li key={m.id} className="border p-2 rounded text-sm">
            {m.user.email} — {m.role}
          </li>
        ))}
      </ul>
    </div>
  );
}