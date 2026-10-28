import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { aggregateReport } from "@/lib/report-aggregator";
import { renderReportPdf } from "@/lib/report-pdf";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;

  let orgId: string | null = null;
  try {
    const { getActiveOrgId } = await import("@/lib/org");
    orgId = await getActiveOrgId(userId);
  } catch {
    orgId = null;
  }
  if (!orgId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  // Verify membership (throws when not a member)
  try {
    await requireOrg(userId, orgId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await aggregateReport(campaignId, orgId);
  if (!data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const buf = await renderReportPdf(data);
  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="training-report-${campaignId}.pdf"`,
    },
  });
}