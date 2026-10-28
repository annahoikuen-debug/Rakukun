import { auth } from "@/auth";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { prisma } from "@/lib/prisma";
import { syncTrainingResults } from "@/lib/rid-sync";
import { aggregateReport } from "@/lib/report-aggregator";
import { completeCampaignAction } from "@/app/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import ReviewCommentForm from "@/components/ReviewCommentForm";
import AnonymizeButton from "@/components/AnonymizeButton";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  const session = await auth();
  if (!session?.userId) redirect("/signin");
  const userId = session.userId as string;
  const { org } = await requireOrg(userId);
  const client = await orgClient(org.id);

  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: numId, tenantId: org.id },
  });

  // Reconcile gophish results -> training results (handles scheduled campaigns).
  if (tc) {
    await syncTrainingResults(org.id, tc.id, numId, client).catch(() => 0);
  }

  const report = tc ? await aggregateReport(numId, org.id) : null;
  const campaign = tc ? await client.getCampaign(numId).catch(() => null) : null;

  if (!tc) {
    return (
      <div>
        <p className="text-sm text-gray-500">このキャンペーンはこのテナントに属していません。</p>
        <Link href="/dashboard/campaigns" className="border px-3 py-1 rounded text-sm mt-2 inline-block">Back</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{campaign?.name ?? tc.title}</h1>
        <div className="flex gap-2">
          <a href={`/api/campaigns/${numId}/report-pdf`} className="border px-3 py-1 rounded text-sm">Download PDF report</a>
          <form action={completeCampaignAction.bind(null, numId) as any}>
            <button className="border px-3 py-1 rounded text-sm">Complete</button>
          </form>
          <Link href="/dashboard/campaigns" className="border px-3 py-1 rounded text-sm">Back</Link>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">Status: {campaign?.status ?? tc.status}</p>

      {report && (
        <>
          <h2 className="font-semibold mb-2">サマリー</h2>
          <table className="w-full text-sm border mb-6 max-w-2xl">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-left">対象者数</th>
                <th className="p-2">クリック数</th>
                <th className="p-2">クリック率</th>
                <th className="p-2">教育完了数</th>
                <th className="p-2">教育完了率</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">{report.overall.sent}</td>
                <td className="p-2 text-center">{report.overall.clicked}</td>
                <td className="p-2 text-center">{report.overall.clickRate}%</td>
                <td className="p-2 text-center">{report.overall.quizCompleted}</td>
                <td className="p-2 text-center">{report.overall.quizCompletionRate}%</td>
              </tr>
            </tbody>
          </table>

          <h2 className="font-semibold mb-2">部署別</h2>
          <table className="w-full text-sm border mb-6 max-w-2xl">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-left">部署</th>
                <th className="p-2">対象</th>
                <th className="p-2">クリック</th>
                <th className="p-2">クリック率</th>
                <th className="p-2">教育完了率</th>
              </tr>
            </thead>
            <tbody>
              {report.departments.map((d, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{d.department}</td>
                  <td className="p-2 text-center">{d.sent}</td>
                  <td className="p-2 text-center">{d.clicked}</td>
                  <td className="p-2 text-center">{d.clickRate}%</td>
                  <td className="p-2 text-center">{d.quizCompletionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="font-semibold mb-2">受講結果一覧</h2>
          <table className="w-full text-sm border mb-6">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-left">氏名</th>
                <th className="p-2">部署</th>
                <th className="p-2 text-left">メール</th>
                <th className="p-2">開封</th>
                <th className="p-2">教育完了日時</th>
              </tr>
            </thead>
            <tbody>
              {report.employees.map((e, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{e.name}</td>
                  <td className="p-2">{e.department}</td>
                  <td className="p-2">{e.email}</td>
                  <td className="p-2 text-center">{e.isHumanClicked ? "有" : "無"}</td>
                  <td className="p-2 text-center">{e.quizCompletedAt ? e.quizCompletedAt.slice(0, 19).replace("T", " ") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 className="font-semibold mb-2">総評・改善計画コメント</h2>
      <ReviewCommentForm campaignId={numId} initial={tc.reviewComment ?? ""} />
      <div className="mt-4"><AnonymizeButton tenantId={org.id} /></div>
    </div>
  );
}