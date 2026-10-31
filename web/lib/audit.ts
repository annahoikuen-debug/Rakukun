import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Best-effort audit logging helper.
 *
 * Writes to `prisma.auditLog.create` but never throws, so a failure in the
 * audit write can never break the main request flow. Failures are logged
 * via the structured logger for visibility.
 *
 * For high-severity events (severity: "high") the write is retried up to 3
 * times with backoff before giving up, so security-relevant audit entries are
 * far less likely to be silently dropped.
 */
export async function auditLog({
  userId,
  userEmail,
  action,
  entityType,
  entityId,
  metadata,
  ip,
  userAgent,
  tenantId,
  severity,
}: {
  userId?: string;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  tenantId?: string;
  severity?: "low" | "high";
}): Promise<void> {
  const high = severity === "high";
  const maxAttempts = high ? 3 : 1;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          userEmail,
          action,
          entityType,
          entityId,
          metadata: metadata ? (metadata as any) : undefined,
          ipAddress: ip,
          userAgent,
          tenantId,
        },
      });
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
      }
    }
  }
  logger.error("audit log write failed", {
    action,
    entityType,
    entityId,
    tenantId,
    severity: severity ?? "low",
    attempts: maxAttempts,
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  });
}