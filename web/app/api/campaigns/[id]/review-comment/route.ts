import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignId = Number(id);
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const { org } = await requireOrg(userId);

  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: campaignId, tenantId: org.id },
  });
  if (!tc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const comment = String(body?.comment ?? "");
  await prisma.trainingCampaign.update({ where: { id: tc.id }, data: { reviewComment: comment } });
  return NextResponse.json({ ok: true });
}