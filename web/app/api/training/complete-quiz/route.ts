import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rid = String(body?.rid ?? "");
  if (!rid) return NextResponse.json({ error: "missing rid" }, { status: 400 });

  const result = await prisma.trainingResult.findFirst({ where: { gophishResultId: rid } });
  if (!result) return NextResponse.json({ ok: false, reason: "not found" }, { status: 404 });

  // Idempotent: record quiz completion only; do NOT mark as a click (separate metric).
  await prisma.trainingResult.updateMany({
    where: { id: result.id, quizCompletedAt: null },
    data: { isQuizCompleted: true, quizCompletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, status: "follow-up completed" });
}