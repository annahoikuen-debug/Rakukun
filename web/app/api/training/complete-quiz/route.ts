import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rid = String(body?.rid ?? "");
  if (!rid) return NextResponse.json({ error: "missing rid" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`training:quiz:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const result = await prisma.trainingResult.findFirst({ where: { gophishResultId: rid } });
  if (!result) return NextResponse.json({ ok: false, reason: "not found" }, { status: 404 });

  // Idempotent: record quiz completion only; do NOT mark as a click (separate metric).
  await prisma.trainingResult.updateMany({
    where: { id: result.id, quizCompletedAt: null },
    data: { isQuizCompleted: true, quizCompletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, status: "follow-up completed" });
}