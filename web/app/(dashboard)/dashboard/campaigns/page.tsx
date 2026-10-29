import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import NotProvisioned from "@/components/NotProvisioned";
import Link from "next/link";
import { deleteCampaignAction } from "@/app/actions";

export default async function CampaignsPage() {
  const session = await auth();
  const userId = session!.userId as string;
  const { org } = await requireOrg(userId);
  let client;
  try { client = await orgClient(org.id); } catch { return <NotProvisioned />; }
  let campaigns: any[] = [];
  try { campaigns = await client.getCampaigns(); } catch { campaigns = []; }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <Link href="/dashboard/campaigns/new" className="bg-black text-white px-3 py-1 rounded text-sm">New campaign</Link>
      </div>
      <table className="w-full text-sm border">
        <thead><tr className="border-b"><th className="p-2 text-left">Name</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {campaigns.map((c: any) => (
            <tr key={c.id} className="border-b">
              <td className="p-2"><Link href={`/dashboard/campaigns/${c.id}`} className="underline">{c.name}</Link></td>
              <td className="p-2 text-center">{c.status}</td>
              <td className="p-2 text-center">
                <form action={deleteCampaignAction.bind(null, c.id) as any} className="inline">
                  <button className="text-red-600 text-xs">Delete</button>
                </form>
              </td>
            </tr>
          ))}
          {campaigns.length === 0 && (
            <tr>
              <td colSpan={3} className="p-8 text-center">
                <span className="text-gray-400 text-2xl">📭</span>
                <h2 className="text-sm font-semibold mt-2">No campaigns</h2>
                <p className="text-xs text-gray-500 mt-1">Create your first campaign to start phishing simulations.</p>
                <Link
                  href="/dashboard/campaigns/new"
                  className="mt-3 inline-block text-xs underline hover:text-indigo-600"
                >
                  Create campaign
                </Link>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}