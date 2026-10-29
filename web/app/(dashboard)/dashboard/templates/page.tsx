import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import NotProvisioned from "@/components/NotProvisioned";
import Link from "next/link";
import { createTemplateAction, deleteTemplateAction } from "@/app/actions";

export default async function TemplatesPage() {
  const session = await auth();
  const userId = session!.userId as string;
  const { org } = await requireOrg(userId);
  let client;
  try { client = await orgClient(org.id); } catch { return <NotProvisioned />; }
  const templates = await client.getTemplates().catch(() => []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Templates</h1>
        <Link href="/dashboard/templates/new" className="bg-black text-white px-3 py-1 rounded text-sm">New template</Link>
      </div>
      <form action={createTemplateAction as any} className="space-y-2 mb-6 max-w-xl border p-4 rounded">
        <input name="name" required placeholder="Name" className="w-full border p-2 rounded" />
        <input name="subject" required placeholder="Subject" className="w-full border p-2 rounded" />
        <input name="envelope_sender" placeholder="Envelope sender (optional)" className="w-full border p-2 rounded" />
        <textarea name="text" placeholder="Plain text body" className="w-full border p-2 rounded" rows={3} />
        <textarea name="html" required placeholder="HTML body" className="w-full border p-2 rounded" rows={6} />
        <button className="bg-black text-white px-3 py-1 rounded" type="submit">Create template</button>
      </form>
      {templates.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-gray-50">
          <span className="text-gray-400">📭</span>
          <h2 className="text-sm font-semibold mt-2">No templates yet</h2>
          <p className="text-xs text-gray-500 mt-1">Create your first email template to use in campaigns.</p>
          <Link
            href="/dashboard/templates/new"
            className="mt-4 inline-block text-xs underline hover:text-indigo-600"
          >
            Create template
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {templates.map((t: any) => (
            <li key={t.id} className="flex items-center justify-between border p-2 rounded">
              <span>{t.name} — {t.subject}</span>
              <form action={deleteTemplateAction.bind(null, t.id) as any}>
                <button className="text-red-600 text-sm">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
