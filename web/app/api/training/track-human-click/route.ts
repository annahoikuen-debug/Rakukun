import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rid = String(body?.rid ?? "");
  // Gophish result IDs are alphanumeric; reject anything else to reduce enumeration.
  if (!rid || rid.length < 5 || rid.length > 40 || !/^[A-Za-z0-9_-]+$/.test(rid)) {
    return NextResponse.json({ error: "invalid rid" }, { status: 400 });
  }

  // Rate-limit by IP to slow down enumeration/forgery of result IDs.
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`training:click:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  // Look up by the unguessable publicToken only. gophishResultId is a global
  // sequential ID: accepting it here would let an attacker mark another
  // tenant's employees as clicked/completed (H12).
  const result = await prisma.trainingResult.findFirst({
    where: { publicToken: rid },
  });
  if (!result) return NextResponse.json({ ok: false, reason: "not found" }, { status: 404 });

  // Idempotent: only set clickedAt the first time.
  await prisma.trainingResult.updateMany({
    where: { id: result.id, clickedAt: null },
    data: { isHumanClicked: true, clickedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}