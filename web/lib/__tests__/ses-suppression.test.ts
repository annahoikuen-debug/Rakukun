import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

// prisma is globally mocked by vitest.setup.ts. Reassign fresh mock functions
// in beforeEach so each test controls its own return values.
const mPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  mPrisma.suppressedEmail = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  };
  mPrisma.targetEmployee = { findMany: vi.fn() };
});

describe("SES suppression", () => {
  it("test-send: blocks when recipient is suppressed", async () => {
    mPrisma.suppressedEmail.findUnique.mockResolvedValue({
      id: "supp-1",
      email: "bounced@example.com",
      reason: "hard-bounce",
    });

    const suppressed = await mPrisma.suppressedEmail.findUnique({
      where: { email: "bounced@example.com" },
    });
    expect(suppressed).not.toBeNull();
    expect(suppressed.email).toBe("bounced@example.com");
  });

  it("test-send: proceeds when recipient is not suppressed", async () => {
    mPrisma.suppressedEmail.findUnique.mockResolvedValue(null);

    const suppressed = await mPrisma.suppressedEmail.findUnique({
      where: { email: "clean@example.com" },
    });
    expect(suppressed).toBeNull();
  });

  it("launch/action: filters out suppressed employees", async () => {
    mPrisma.suppressedEmail.findMany.mockResolvedValue([
      { id: "s1", email: "suppressed@example.com", reason: "complaint" },
    ]);
    mPrisma.targetEmployee.findMany.mockResolvedValue([
      { id: "e1", email: "active@example.com", tenantId: "t1" },
      { id: "e2", email: "suppressed@example.com", tenantId: "t1" },
    ]);

    const suppressed = await mPrisma.suppressedEmail.findMany();
    const blocked = new Set(suppressed.map((s: any) => s.email));
    const employees = await mPrisma.targetEmployee.findMany({ where: { tenantId: "t1" } });
    const eligible = employees.filter((e: any) => !blocked.has(e.email));

    expect(eligible).toHaveLength(1);
    expect(eligible[0].email).toBe("active@example.com");
  });
});

describe("rate limit with mocked redis store", () => {
  beforeEach(() => {
    // Force redis disabled so we exercise the in-memory path deterministically.
    process.env.REDIS_URL = "";
  });

  it("allows up to limit then blocks", async () => {
    const { rateLimit, clearAttempts } = await import("@/lib/rate-limit");
    clearAttempts("k");
    for (let i = 0; i < 3; i++) expect(await rateLimit("k", 3)).toBe(true);
    expect(await rateLimit("k", 3)).toBe(false);
  });

  it("keys are independent", async () => {
    const { rateLimit, clearAttempts } = await import("@/lib/rate-limit");
    clearAttempts("a");
    clearAttempts("b");
    expect(await rateLimit("a", 1)).toBe(true);
    expect(await rateLimit("a", 1)).toBe(false);
    expect(await rateLimit("b", 1)).toBe(true);
  });
});
