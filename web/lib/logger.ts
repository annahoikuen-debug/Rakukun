/**
 * Rakukun structured logger.
 *
 * Emits one JSON object per log line so production log collectors
 * (Datadog, Logtail, CloudWatch, etc.) can ingest fields directly.
 *
 * Levels: info | warn | error
 * - In development (`NODE_ENV !== "production"`) logs are pretty-printed
 *   for local readability but remain valid JSON.
 * - In production logs are compact single-line JSON.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("campaign created", { campaignId, userId });
 *   logger.warn("rate limit approached", { ip, path });
 *   logger.error("failed to send email", { error, context });
 */

export type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  env?: string;
  requestId?: string;
  [key: string]: unknown;
}

const SERVICE = "rakukun";
const isProduction = process.env.NODE_ENV === "production";

function baseEntry(level: LogLevel, message: string, requestId?: string): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: SERVICE,
    env: process.env.NODE_ENV,
    requestId,
  };
}

function serialize(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function write(level: LogLevel, message: string, meta: Record<string, unknown> = {}, requestId?: string): void {
  const entry: LogEntry = { ...baseEntry(level, message, requestId), ...meta };
  const line = serialize(entry);
  // In production keep logs compact; in dev pretty-print for readability.
  const out = isProduction ? line : JSON.stringify(entry, null, 2);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(out);
  } else {
    // eslint-disable-next-line no-console
    console.log(out);
  }
}

/**
 * Create a child logger bound to a request ID, so every log line within a
 * request carries the same `requestId` for traceability.
 */
export function createRequestLogger(requestId: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta, requestId),
    warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta, requestId),
    error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta, requestId),
  };
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};
