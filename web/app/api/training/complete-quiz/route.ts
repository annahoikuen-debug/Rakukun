import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rid = String(body?.rid ?? "");
  if (!rid || rid.length < 5 || rid.length > 40 || !/^[A-Za-z0-9_-]+$/.test(rid)) {
    return NextResponse.json({ error: "invalid rid" }, { status: 400 });
  }

  const ip = clientIp(req.headers);
  if (!(await rateLimit(`training:quiz:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const result = await prisma.trainingResult.findFirst({
    where: { OR: [{ gophishResultId: rid }, { publicToken: rid }] },
  });
  if (!result) return NextResponse.json({ ok: false, reason: "not found" }, { status: 404 });

  // Human-click must be recorded before quiz completion can count as a verified follow-up.
  if (!result.isHumanClicked) {
    return NextResponse.json(
      { ok: false, reason: "human click not recorded yet" },
      { status: 409 },
    );
  }

  // Idempotent: record quiz completion only; do NOT mark as a click (separate metric).
  await prisma.trainingResult.updateMany({
    where: { id: result.id, quizCompletedAt: null },
    data: { isQuizCompleted: true, quizCompletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, status: "follow-up completed" });
}