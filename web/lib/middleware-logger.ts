import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Next.js middleware that logs incoming requests with method, path, status,
 * duration, and user ID (when available).
 *
 * Usage in middleware.ts:
 *
 *   import { withRequestLogging } from "@/lib/middleware-logger";
 *
 *   export default function middleware(req) {
 *     const start = Date.now();
 *     const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
 *     const userId = (req as any).auth?.userId;
 *
 *     const response = NextResponse.next();
 *
 *     return withRequestLogging(req, response, start, { requestId, userId });
 *   }
 *
 *   export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"] };
 */

export function withRequestLogging(
  req: NextRequest,
  response: NextResponse,
  startTime: number,
  meta: { requestId?: string; userId?: string } = {}
): NextResponse {
  const duration = Date.now() - startTime;
  const requestId = meta.requestId ?? req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { pathname } = req.nextUrl;

  logger.info("request completed", {
    requestId,
    method: req.method,
    path: pathname,
    status: response.status,
    durationMs: duration,
    userId: meta.userId,
  });

  // Propagate request-id header for downstream tracing.
  response.headers.set("x-request-id", requestId);
  return response;
}
