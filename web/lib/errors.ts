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
