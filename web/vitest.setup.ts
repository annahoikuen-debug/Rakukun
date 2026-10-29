import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";

// Prisma Client をモックして、DB 依存のないユニットテストを可能にする。
vi.mock("@/lib/prisma", () => {
  const m = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn(async (fn: any) => fn(m)),
    tenant: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    trainingCampaign: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    trainingResult: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    targetEmployee: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    sesEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    suppressedEmail: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  return { prisma: m };
});

beforeAll(() => {});
afterAll(() => {});
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {});
