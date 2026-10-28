import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { assertEmailMatchesTenant } from "@/lib/domain-guard";
import { toOrgErrorStatus } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const orgId = await (await import("@/lib/org")).getActiveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
  let org, membership, client;
  try {
    const r = await requireOrg(userId, orgId);
    org = r.org;
    membership = r.membership;
    client = await orgClient(r.org.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: toOrgErrorStatus(e) });
  }
  if (membership.role === "MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { smtpName, templateName, recipientEmail, url } = body ?? {};

  const domainErr = assertEmailMatchesTenant(recipientEmail, org.domain);
  if (domainErr) return NextResponse.json({ error: domainErr }, { status: 400 });

  try {
    const res = await client.sendTestEmail({
      smtp: { name: smtpName },
      template: templateName ? { name: templateName } : undefined,
      url: url || "http://localhost",
      email: recipientEmail,
      first_name: "Admin",
    });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "send failed" }, { status: 500 });
  }
}