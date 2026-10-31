import { describe, it, expect, vi, beforeAll } from "vitest";
import crypto from "crypto";
import { generateTotpSecret, totpAt, verifyTotp, generateRecoveryCodes, verifyRecoveryCode, encryptSecret } from "@/lib/mfa";

beforeAll(() => {
  process.env.GOPHISH_KEY_ENCRYPTION_SECRET = "test-encryption-secret-0123456789abcdef";
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mfaRecoveryCode: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { verifySecondFactor } from "@/lib/mfa-login";
import { prisma } from "@/lib/prisma";

describe("TOTP", () => {
  it("verifies the current code", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = totpAt(secret, now);
    expect(verifyTotp(secret, code)).toBe(true);
  });
  it("rejects a wrong code", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, "000000")).toBe(false);
  });
  it("round-trips recovery codes", () => {
    const { plain, hashed } = generateRecoveryCodes(3);
    expect(plain.length).toBe(3);
    expect(verifyRecoveryCode(plain[0], hashed[0])).toBe(true);
    expect(verifyRecoveryCode("AAAA-BBBB", hashed[0])).toBe(false);
  });
});

describe("verifySecondFactor", () => {
  it("accepts a valid TOTP", async () => {
    const secret = generateTotpSecret();
    const enc = encryptSecret(secret);
    const code = totpAt(secret, Date.now());
    expect(await verifySecondFactor("u1", enc, code)).toBe(true);
  });
  it("rejects an invalid TOTP", async () => {
    const secret = generateTotpSecret();
    const enc = encryptSecret(secret);
    expect(await verifySecondFactor("u1", enc, "000000")).toBe(false);
  });
  it("rejects when no secret is stored", async () => {
    expect(await verifySecondFactor("u1", null, "123456")).toBe(false);
  });
  it("consumes a valid recovery code (single-use)", async () => {
    const { plain } = generateRecoveryCodes(1);
    (prisma.mfaRecoveryCode.findMany as any).mockResolvedValue([
      { id: "c1", codeHash: crypto.createHash("sha256").update(plain[0]).digest("hex") },
    ]);
    const enc = encryptSecret(generateTotpSecret());
    expect(await verifySecondFactor("u1", enc, plain[0])).toBe(true);
    expect(prisma.mfaRecoveryCode.update).toHaveBeenCalled();
  });
  it("rejects an unknown recovery code", async () => {
    (prisma.mfaRecoveryCode.findMany as any).mockResolvedValue([]);
    const enc = encryptSecret(generateTotpSecret());
    expect(await verifySecondFactor("u1", enc, "ABCD-1234")).toBe(false);
  });
});