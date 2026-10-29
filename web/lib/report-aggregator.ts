import { prisma } from "./prisma";

export interface DepartmentStat {
  department: string;
  sent: number;
  clicked: number;
  clickRate: number; // percent
  quizCompleted: number;
  quizCompletionRate: number; // percent
}

export interface EmployeeRow {
  name: string;
  email: string;
  department: string;
  isHumanClicked: boolean;
  quizCompletedAt: string | null;
}

export interface ReportData {
  campaignId: number;
  campaignTitle: string;
  templateKey: string;
  periodStart: string | null;
  periodEnd: string | null;
  tenantName: string;
  overall: {
    sent: number;
    clicked: number;
    clickRate: number;
    quizCompleted: number;
    quizCompletionRate: number;
  };
  departments: DepartmentStat[];
  employees: EmployeeRow[];
  autoComment: string;
  reviewComment: string | null;
}

function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

export function buildAutoComment(clickRate: number): string {
  if (clickRate >= 30) {
    return "訓練メールのリンクをクリックした割合が30%を超えています。フィッシングメールの見分け方について、全社的な再教育および送信元確認手順の徹底を推奨します。次回訓練では標的型メールの特徴解説と報告フローの演習を追加してください。";
  }
  if (clickRate >= 10) {
    return "一定数のクリックが確認されました。部署別の傾向を踏まえ、該当部署を中心に追加教育を実施してください。URLや送信元ドメインの確認習慣を定着させるための周知を推奨します。";
  }
  return "クリック率は低く、全般的に良好な結果です。現行の教育プログラムを継続しつつ、定期的な訓練と最新の攻撃手法の共有を継続してください。";
}

export async function aggregateReport(campaignId: number, tenantId?: string): Promise<ReportData | null> {
  const tc = await prisma.trainingCampaign.findFirst({
    where: {
      gophishCampaignId: campaignId,
      ...(tenantId ? { tenantId } : {}),
    },
    include: { tenant: true },
  });
  if (!tc) return null;

  const tenantName = tc?.tenant?.name ?? "Unknown";
  const templateKey = tc?.templateKey ?? "N/A";

  const results = tc
    ? await prisma.trainingResult.findMany({
        where: { trainingCampaignId: tc.id },
        include: { targetEmployee: true },
      })
    : [];

  // "sent" only counts results whose email was actually dispatched.
  const sentResults = (results as any[]).filter((r) => r.emailSentAt != null);
  const deptMap = new Map<string, { sent: number; clicked: number; quiz: number }>();
  for (const r of sentResults) {
    const dept = r.targetEmployee.department || "未分類";
    const cur = deptMap.get(dept) ?? { sent: 0, clicked: 0, quiz: 0 };
    cur.sent += 1;
    if (r.isHumanClicked) cur.clicked += 1;
    if (r.isQuizCompleted) cur.quiz += 1;
    deptMap.set(dept, cur);
  }

  const departments: DepartmentStat[] = Array.from(deptMap.entries()).map(([department, v]) => ({
    department,
    sent: v.sent,
    clicked: v.clicked,
    clickRate: pct(v.clicked, v.sent),
    quizCompleted: v.quiz,
    quizCompletionRate: pct(v.quiz, v.sent),
  }));

  const totalSent = sentResults.length;
  const totalClicked = sentResults.filter((r:any) => r.isHumanClicked).length;
  const totalQuiz = sentResults.filter((r:any) => r.isQuizCompleted).length;

  const overall = {
    sent: totalSent,
    clicked: totalClicked,
    clickRate: pct(totalClicked, totalSent),
    quizCompleted: totalQuiz,
    quizCompletionRate: pct(totalQuiz, totalSent),
  };

  const employees: EmployeeRow[] = (results as any[]).map((r) => ({
    name: r.targetEmployee.name,
    email: r.targetEmployee.email,
    department: r.targetEmployee.department,
    isHumanClicked: !!r.isHumanClicked,
    quizCompletedAt: r.quizCompletedAt ? r.quizCompletedAt.toISOString() : null,
  }));

  return {
    campaignId,
    campaignTitle: tc?.title ?? `Campaign ${campaignId}`,
    templateKey,
    periodStart: tc?.startDate ? tc.startDate.toISOString() : null,
    periodEnd: tc?.sendByDate ? tc.sendByDate.toISOString() : null,
    tenantName,
    overall,
    departments,
    employees,
    autoComment: buildAutoComment(overall.clickRate),
    reviewComment: tc?.reviewComment ?? null,
  };
}