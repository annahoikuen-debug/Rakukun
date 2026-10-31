import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { toOrgErrorStatus } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;

  let org, client;
  try {
    const r = await requireOrg(userId);
    org = r.org;
    client = await orgClient(org.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: toOrgErrorStatus(e) });
  }

  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: numId, tenantId: org.id },
  });
  if (!tc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { syncTrainingResults } = await import("@/lib/rid-sync");
  const mapped = await syncTrainingResults(org.id, tc.id, numId, client);
  return NextResponse.json({ ok: true, mapped });
}