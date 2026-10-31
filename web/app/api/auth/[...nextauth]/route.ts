import { handlers } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { NextResponse } from "next/server";

const { GET: _GET, POST: _POST } = handlers;
export const GET = _GET;

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  // IP-level guard against distributed credential stuffing.
  if (!(await rateLimit(`login-ip:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  return _POST(req as any);
}