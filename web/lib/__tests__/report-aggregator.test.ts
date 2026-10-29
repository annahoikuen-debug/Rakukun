import { describe, it, expect, vi, beforeEach } from "vitest";
import { aggregateReport, buildAutoComment } from "@/lib/report-aggregator";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingCampaign: { findFirst: vi.fn() },
    trainingResult: { findMany: vi.fn() },
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockFindFirst = (prisma as any).trainingCampaign.findFirst;
const mockFindMany = (prisma as any).trainingResult.findMany;

beforeEach(() => {
  mockFindFirst.mockReset();
  mockFindMany.mockReset();
});

describe("buildAutoComment", () => {
  it("returns high-click comment for >=30%", () => {
    expect(buildAutoComment(30)).toContain("30%");
    expect(buildAutoComment(35)).toContain("30%");
  });
  it("returns medium comment for >=10%", () => {
    expect(buildAutoComment(10)).toContain("一定数のクリック");
    expect(buildAutoComment(25)).toContain("一定数のクリック");
  });
  it("returns low comment for <10%", () => {
    expect(buildAutoComment(0)).toContain("良好な結果");
    expect(buildAutoComment(5)).toContain("良好な結果");
  });
});

describe("aggregateReport", () => {
  const baseCampaign = {
    id: "camp-1",
    gophishCampaignId: 1,
    title: "テストキャンペーン",
    templateKey: "delivery",
    startDate: new Date("2026-01-01T00:00:00Z"),
    sendByDate: new Date("2026-01-08T00:00:00Z"),
    reviewComment: null,
  };

  it("returns null when campaign not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await aggregateReport(999, "tenant-1");
    expect(result).toBeNull();
  });

  it("aggregates report with plan and departments", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseCampaign,
      tenant: { id: "tenant-1", name: "テスト株式会社", plan: "STANDARD" },
    });
    mockFindMany.mockResolvedValue([
      {
        emailSentAt: new Date("2026-01-02T00:00:00Z"),
        isHumanClicked: true,
        isQuizCompleted: true,
        quizCompletedAt: new Date("2026-01-03T00:00:00Z"),
        targetEmployee: { name: "山田太郎", email: "yamada@example.com", department: "営業" },
      },
      {
        emailSentAt: new Date("2026-01-02T00:00:00Z"),
        isHumanClicked: false,
        isQuizCompleted: false,
        quizCompletedAt: null,
        targetEmployee: { name: "佐藤花子", email: "sato@example.com", department: "営業" },
      },
      {
        emailSentAt: null,
        isHumanClicked: false,
        isQuizCompleted: false,
        quizCompletedAt: null,
        targetEmployee: { name: "鈴木次郎", email: "suzuki@example.com", department: "開発" },
      },
    ]);

    const result = await aggregateReport(1, "tenant-1");
    expect(result).not.toBeNull();
    expect(result!.plan).toBe("STANDARD");
    expect(result!.tenantName).toBe("テスト株式会社");
    expect(result!.overall.sent).toBe(2);
    expect(result!.overall.clicked).toBe(1);
    expect(result!.overall.clickRate).toBe(50);
    expect(result!.overall.quizCompleted).toBe(1);
    expect(result!.overall.quizCompletionRate).toBe(50);
    expect(result!.departments.length).toBe(1);
    expect(result!.departments[0].department).toBe("営業");
    expect(result!.departments[0].sent).toBe(2);
    expect(result!.employees.length).toBe(3);
  });

  it("handles zero sent results (division by zero guard)", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseCampaign,
      tenant: { id: "tenant-1", name: "テスト株式会社", plan: "FREE" },
    });
    mockFindMany.mockResolvedValue([
      {
        emailSentAt: null,
        isHumanClicked: false,
        isQuizCompleted: false,
        quizCompletedAt: null,
        targetEmployee: { name: "未送信", email: "none@example.com", department: "総務" },
      },
    ]);

    const result = await aggregateReport(1, "tenant-1");
    expect(result!.overall.sent).toBe(0);
    expect(result!.overall.clickRate).toBe(0);
    expect(result!.overall.quizCompletionRate).toBe(0);
    expect(result!.plan).toBe("FREE");
  });
});
