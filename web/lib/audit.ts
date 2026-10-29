import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Best-effort audit logging helper.
 *
 * Writes to `prisma.auditLog.create` but never throws, so a failure in the
 * audit write can never break the main request flow. Failures are logged
 * via the structured logger for visibility.
 *
 * Usage:
 *   import { auditLog } from "@/lib/audit";
 *   await auditLog({
 *     userId, userEmail, action: "campaign.create",
 *     entityType: "Campaign", entityId: created.id,
 *     metadata: { name, status },
 *     ip, userAgent, tenantId: org.id,
 *   });
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
}): Promise<void> {
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
  } catch (err) {
    // Best-effort: never break the main flow if the audit write fails.
    logger.error("audit log write failed", {
      action,
      entityType,
      entityId,
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
