import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { aggregateReport } from "@/lib/report-aggregator";
import { renderReportPdf } from "@/lib/report-pdf";
import { toOrgErrorStatus } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: numId, tenantId: org.id },
  });
  if (!tc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reconcile results before rendering.
  try {
    const client = await orgClient(org.id);
    const { syncTrainingResults } = await import("@/lib/rid-sync");
    await syncTrainingResults(org.id, tc.id, numId, client);
  } catch {
    // best-effort
  }

  const report = await aggregateReport(numId, org.id);
  if (!report) return NextResponse.json({ error: "Report data unavailable" }, { status: 404 });

  const buffer = await renderReportPdf(report);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${numId}.pdf"`,
    },
  });
}