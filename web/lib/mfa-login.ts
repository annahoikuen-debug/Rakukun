// Second-factor verification at login (TOTP or recovery code).
// Kept separate from lib/mfa.ts so that module stays DB-free/pure.
import { prisma } from "@/lib/prisma";
import { verifyTotp, decryptSecret, verifyRecoveryCode } from "@/lib/mfa";

const RECOVERY_PATTERN = /^[0-9A-F]{4}-[0-9A-F]{4}$/i;

/**
 * Verify a second factor for a user. `token` may be a 6-digit TOTP or a
 * XXXX-XXXX recovery code. `mfaSecret` is the user's encrypted TOTP secret.
 * Returns true when the factor is valid; recovery codes are consumed
 * (single-use) on success.
 */
export async function verifySecondFactor(userId: string, mfaSecret: string | null, token: string): Promise<boolean> {
  const cleaned = token.trim();
  if (!cleaned) return false;

  if (RECOVERY_PATTERN.test(cleaned)) {
    if (!mfaSecret) return false;
    const codes = await prisma.mfaRecoveryCode.findMany({ where: { userId, usedAt: null } });
    for (const c of codes) {
      if (verifyRecoveryCode(cleaned, c.codeHash)) {
        await prisma.mfaRecoveryCode.update({ where: { id: c.id }, data: { usedAt: new Date() } });
        return true;
      }
    }
    return false;
  }

  if (!mfaSecret) return false;
  const secret = decryptSecret(mfaSecret);
  return verifyTotp(secret, cleaned);
}