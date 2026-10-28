import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import NotProvisioned from "@/components/NotProvisioned";
import { createSmtpAction, deleteSmtpAction } from "@/app/actions";

export default async function SendingProfilesPage() {
  const session = await auth();
  const userId = session!.userId as string;
  const { org } = await requireOrg(userId);
  let client;
  try { client = await orgClient(org.id); } catch { return <NotProvisioned />; }
  const profiles = await client.getSendingProfiles().catch(() => []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Sending Profiles</h1>
      <form action={createSmtpAction as any} className="space-y-2 mb-6 max-w-xl border p-4 rounded">
        <input name="name" required placeholder="Name" className="w-full border p-2 rounded" />
        <input name="host" required placeholder="Host (smtp.example.com:587)" className="w-full border p-2 rounded" />
        <input name="username" placeholder="Username" className="w-full border p-2 rounded" />
        <input name="password" type="password" placeholder="Password" className="w-full border p-2 rounded" />
        <input name="from_address" required type="email" placeholder="From address" className="w-full border p-2 rounded" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ignore_cert_errors" /> Ignore cert errors
        </label>
        <button className="bg-black text-white px-3 py-1 rounded" type="submit">Create profile</button>
      </form>
      <ul className="space-y-2">
        {profiles.map((s: any) => (
          <li key={s.id} className="flex items-center justify-between border p-2 rounded">
            <span>{s.name} — {s.from_address}</span>
            <form action={deleteSmtpAction.bind(null, s.id) as any}>
              <button className="text-red-600 text-sm">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}