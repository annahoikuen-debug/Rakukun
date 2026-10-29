import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const { getActiveOrgId } = await import("@/lib/org");
  const orgId = await getActiveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  let org;
  try {
    const r = await requireOrg(userId, orgId);
    org = r.org;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }

  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: campaignId, tenantId: org.id },
  });
  if (!tc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const comment = String(body?.comment ?? "").slice(0, 5000);
  await prisma.trainingCampaign.update({ where: { id: tc.id }, data: { reviewComment: comment || null } });
  return NextResponse.json({ ok: true });
}