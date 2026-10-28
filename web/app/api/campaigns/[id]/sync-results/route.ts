import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { syncTrainingResults } from "@/lib/rid-sync";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const { getActiveOrgId } = await import("@/lib/org");
  const orgId = await getActiveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
  const { org } = await requireOrg(userId, orgId);

  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: campaignId, tenantId: org.id },
  });
  if (!tc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const client = await orgClient(org.id);
  const mapped = await syncTrainingResults(org.id, tc.id, campaignId, client);
  return NextResponse.json({ ok: true, mapped });
}