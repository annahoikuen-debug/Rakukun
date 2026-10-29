import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.userId as string;
  if (!userId) return <div className="p-4 text-sm">Not signed in</div>;
  const { org } = await requireOrg(userId);

  const campaigns = await prisma.trainingCampaign.findMany({
    where: { tenantId: org.id },
    include: { results: { include: { targetEmployee: true } } },
    orderBy: { createdAt: "desc" },
  });

  let overallSent = 0,
    overallClicked = 0,
    overallQuiz = 0;
  campaigns.forEach((tc) => {
    const results = tc.results as any[];
    const sentResults = results.filter((r) => r.emailSentAt != null);
    overallSent += sentResults.length;
    overallClicked += sentResults.filter((r) => r.isHumanClicked).length;
    overallQuiz += sentResults.filter((r) => r.isQuizCompleted).length;
  });
  const overallClickRate = overallSent ? Math.round((overallClicked / overallSent) * 1000) / 10 : 0;
  const overallQuizRate = overallSent ? Math.round((overallQuiz / overallSent) * 1000) / 10 : 0;

  const deptStats = campaigns.reduce<Map<string, { sent: number; clicked: number; quiz: number }>>(
    (acc, tc) => {
      (tc.results as any[]).forEach((r: any) => {
        if (r.emailSentAt == null) return;
        const dept = r.targetEmployee.department || "未分類";
        const cur = acc.get(dept) ?? { sent: 0, clicked: 0, quiz: 0 };
        cur.sent += 1;
        if (r.isHumanClicked) cur.clicked += 1;
        if (r.isQuizCompleted) cur.quiz += 1;
        acc.set(dept, cur);
      });
      return acc;
    },
    new Map(),
  );
  const departments = Array.from(deptStats.entries())
    .map(([department, v]) => ({
      department,
      sent: v.sent,
      clicked: v.clicked,
      clickRate: v.sent ? Math.round((v.clicked / v.sent) * 1000) / 10 : 0,
      quizCompleted: v.quiz,
      quizCompletionRate: v.sent ? Math.round((v.quiz / v.sent) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.clickRate - a.clickRate);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Tenant: {org.name}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded border">
          <div className="text-xs text-gray-500">対象者数（配信済）</div>
          <div className="text-2xl font-bold">{overallSent}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-xs text-gray-500">人間によるクリック数</div>
          <div className="text-2xl font-bold">{overallClicked}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-xs text-gray-500">クリック率</div>
          <div className="text-2xl font-bold">{overallClickRate}%</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-xs text-gray-500">教育完了数</div>
          <div className="text-2xl font-bold">{overallQuiz}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-xs text-gray-500">教育完了率</div>
          <div className="text-2xl font-bold">{overallQuizRate}%</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-xs text-gray-500">キャンペーン数</div>
          <div className="text-2xl font-bold">{campaigns.length}</div>
        </div>
      </div>

      {departments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">部署別クリック率ランキング</h2>
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-left">順位</th>
                <th className="p-2 text-left">部署</th>
                <th className="p-2 text-center">対象</th>
                <th className="p-2 text-center">クリック率</th>
                <th className="p-2 text-center">教育完了率</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 text-center font-bold">{i + 1}位</td>
                  <td className="p-2">{d.department}</td>
                  <td className="p-2 text-center">{d.sent}</td>
                  <td className="p-2 text-center">{d.clickRate}%</td>
                  <td className="p-2 text-center">{d.quizCompletionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">最近のキャンペーン</h2>
        <table className="w-full text-sm border">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2 text-left">訓練名</th>
              <th className="p-2 text-center">ステータス</th>
              <th className="p-2 text-center">対象</th>
              <th className="p-2 text-center">クリック率</th>
              <th className="p-2 text-center">教育完了率</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.slice(0, 10).map((tc) => {
              const results = tc.results as any[];
              const sentResults = results.filter((r) => r.emailSentAt != null);
              const clickRate =
                sentResults.length > 0
                  ? Math.round((sentResults.filter((r) => r.isHumanClicked).length / sentResults.length) * 1000) / 10
                  : 0;
              const quizRate =
                sentResults.length > 0
                  ? Math.round((sentResults.filter((r) => r.isQuizCompleted).length / sentResults.length) * 1000) / 10
                  : 0;
              return (
                <tr key={tc.id} className="border-b">
                  <td className="p-2">{tc.title}</td>
                  <td className="p-2 text-center">{tc.status}</td>
                  <td className="p-2 text-center">{sentResults.length}</td>
                  <td className="p-2 text-center">{clickRate}%</td>
                  <td className="p-2 text-center">{quizRate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
