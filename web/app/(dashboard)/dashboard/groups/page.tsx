import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import NotProvisioned from "@/components/NotProvisioned";
import { createGroupAction, deleteGroupAction } from "@/app/actions";

export default async function GroupsPage() {
  const session = await auth();
  const userId = session!.userId as string;
  const { org } = await requireOrg(userId);
  let client;
  try { client = await orgClient(org.id); } catch { return <NotProvisioned />; }
  const groups = await client.getGroups().catch(() => []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Groups</h1>
      <form action={createGroupAction as any} className="space-y-2 mb-6 max-w-xl border p-4 rounded">
        <input name="name" required placeholder="Group name" className="w-full border p-2 rounded" />
        <textarea name="targets" required placeholder="Targets: email,first,last,position (one per line)" className="w-full border p-2 rounded" rows={6} />
        <button className="bg-black text-white px-3 py-1 rounded" type="submit">Create group</button>
      </form>
      <ul className="space-y-2">
        {groups.map((g: any) => (
          <li key={g.id} className="flex items-center justify-between border p-2 rounded">
            <span>{g.name} ({g.targets?.length ?? 0} targets)</span>
            <form action={deleteGroupAction.bind(null, g.id) as any}>
              <button className="text-red-600 text-sm">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}