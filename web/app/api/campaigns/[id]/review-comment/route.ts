import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { toOrgErrorStatus } from "@/lib/errors";
import { auditLog } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ comment: z.string().max(5000).optional().default("") });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;

  let org;
  try {
    const r = await requireOrg(userId);
    org = r.org;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: toOrgErrorStatus(e) });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: numId, tenantId: org.id },
  });
  if (!tc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.trainingCampaign.update({
    where: { id: tc.id },
    data: { reviewComment: parsed.data.comment },
  });

  await auditLog({
    userId,
    userEmail: session.user?.email ?? undefined,
    action: "campaign.review-comment",
    entityType: "Campaign",
    entityId: String(numId),
    metadata: { length: parsed.data.comment.length },
    tenantId: org.id,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}