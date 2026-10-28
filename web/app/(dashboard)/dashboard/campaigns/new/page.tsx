import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { createCampaignAction } from "@/app/actions";
import Link from "next/link";

export default async function NewCampaignPage() {
  const session = await auth();
  const userId = session!.userId as string;
  const { org } = await requireOrg(userId);
  const client = await orgClient(org.id);
  const [templates, pages, smtps] = await Promise.all([
    client.getTemplates().catch(() => []),
    client.getPages().catch(() => []),
    client.getSendingProfiles().catch(() => []),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">New Campaign</h1>
      <form action={createCampaignAction as any} className="space-y-3 max-w-xl">
        <input name="name" required placeholder="Campaign name" className="w-full border p-2 rounded" />
        <select name="templateName" required className="w-full border p-2 rounded">
          <option value="">Select template</option>
          {templates.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <select name="pageName" required className="w-full border p-2 rounded">
          <option value="">Select landing page</option>
          {pages.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <select name="smtpName" required className="w-full border p-2 rounded">
          <option value="">Select sending profile</option>
          {smtps.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <input name="groupNames" required placeholder="Group names (comma separated)" className="w-full border p-2 rounded" />
        <input name="url" required placeholder="Phishing URL base (e.g. http://localhost)" className="w-full border p-2 rounded" />
        <input name="launch_date" type="datetime-local" className="w-full border p-2 rounded" />
        <input name="send_by_date" type="datetime-local" className="w-full border p-2 rounded" />
        <div className="flex gap-2">
          <button className="bg-black text-white px-3 py-1 rounded" type="submit">Create</button>
          <Link href="/dashboard/campaigns" className="px-3 py-1 border rounded">Cancel</Link>
        </div>
      </form>
    </div>
  );
}