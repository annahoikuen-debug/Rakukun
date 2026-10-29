import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Production health check.
 *
 * Returns { status, timestamp, checks: { db, gophish, redis } }.
 * Individual check failures do not change the overall shape; callers can
 * inspect each boolean. HTTP status is 200 when the app itself is reachable.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  // --- Database check ---
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  // --- Redis check (optional — in-memory fallback used when unset) ---
  let redis = false;
  try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const res = await fetch(`${redisUrl.replace(/^redis:/, "http:")}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });
      redis = res.ok;
    } else {
      // No Redis configured; treat as "not applicable" (in-memory fallback).
      redis = true;
    }
  } catch {
    redis = false;
  }

  // --- Gophish check (internal, may be unreachable from some environments) ---
  let gophish = false;
  try {
    const gophishUrl = process.env.GOPHISH_ADMIN_URL ?? "http://localhost:3333";
    const res = await fetch(`${gophishUrl}/api/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.GOPHISH_ADMIN_API_KEY ?? ""}` },
      signal: AbortSignal.timeout(3000),
    });
    gophish = res.ok || res.status === 401; // reachable even if auth required
  } catch {
    gophish = false;
  }

  const allOk = db && redis;
  const status = allOk ? "ok" : "degraded";

  return NextResponse.json(
    { status, timestamp, checks: { db, gophish, redis } },
    { status: allOk ? 200 : 200 }
  );
}
