import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { logError } from "@/lib/errors";

/**
 * Client-side error reporting endpoint.
 *
 * Frontend code can POST uncaught exceptions / unhandled rejections here:
 *
 *   fetch("/api/errors", {
 *     method: "POST",
 *     body: JSON.stringify({ message, stack, url, userAgent, timestamp }),
 *   });
 *
 * The endpoint logs the error via the structured logger (and logError) but
 * never throws, so a failure in error reporting cannot break the client.
 * Returns 202 Accepted on success.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  const { message, stack, url, userAgent, timestamp, requestId } = body;

  const context: Record<string, unknown> = {
    source: "client",
    clientUrl: url,
    userAgent,
    timestamp,
    requestId,
  };

  // Best-effort structured logging — never throw.
  try {
    logger.error("client-side error", { ...context, message, stack });
    logError(new Error(String(message ?? "client error")), context);
  } catch {
    // Swallow; error reporting must not fail the request.
  }

  return NextResponse.json({ accepted: true }, { status: 202 });
}
