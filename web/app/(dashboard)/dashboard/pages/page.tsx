import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import NotProvisioned from "@/components/NotProvisioned";
import { createPageAction, deletePageAction } from "@/app/actions";

export default async function PagesPage() {
  const session = await auth();
  const userId = session!.userId as string;
  const { org } = await requireOrg(userId);
  let client;
  try { client = await orgClient(org.id); } catch { return <NotProvisioned />; }
  const pages = await client.getPages().catch(() => []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Landing Pages</h1>
      <p className="text-sm text-gray-500 mb-4">Credential capture is permanently disabled for compliance.</p>
      <form action={createPageAction as any} className="space-y-2 mb-6 max-w-xl border p-4 rounded">
        <input name="name" required placeholder="Name" className="w-full border p-2 rounded" />
        <textarea name="html" required placeholder="HTML" className="w-full border p-2 rounded" rows={6} />
        <input name="redirect_url" placeholder="Redirect URL after submit (optional)" className="w-full border p-2 rounded" />
        <button className="bg-black text-white px-3 py-1 rounded" type="submit">Create page</button>
      </form>
      <ul className="space-y-2">
        {pages.map((p: any) => (
          <li key={p.id} className="flex items-center justify-between border p-2 rounded">
            <span>{p.name}</span>
            <form action={deletePageAction.bind(null, p.id) as any}>
              <button className="text-red-600 text-sm">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}