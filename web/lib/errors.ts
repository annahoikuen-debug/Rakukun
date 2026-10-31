import { logger } from "./logger";

export class OrgAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "OrgAccessError";
    this.status = status;
  }
}

export function toOrgErrorStatus(err: unknown): number {
  return err instanceof OrgAccessError ? err.status : 500;
}

/**
 * Produce a client-safe error message. OrgAccessError messages are already
 * generic; any other error is collapsed to a generic string so internal
 * details (stack, DB errors, etc.) are never leaked to the client.
 */
export function toClientMessage(err: unknown): string {
  if (err instanceof OrgAccessError) return err.message;
  return "Internal server error";
}

/**
 * Structured error logging. Captures the error message, stack trace, and an
 * optional context object so production log collectors can correlate errors.
 * Never throws.
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const err = error as Error;
  logger.error("unhandled error", {
    ...(context ?? {}),
    error: {
      name: err?.name ?? "Error",
      message: err?.message ?? String(error),
      stack: err?.stack ?? undefined,
    },
  });
}
