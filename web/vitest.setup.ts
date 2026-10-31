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
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    trainingResult: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    campaignLink: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    targetEmployee: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    processedStripeEvent: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    mfaRecoveryCode: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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
