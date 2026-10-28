import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rid = String(body?.rid ?? "");
  if (!rid) return NextResponse.json({ error: "missing rid" }, { status: 400 });

  const result = await prisma.trainingResult.findFirst({ where: { gophishResultId: rid } });
  if (!result) return NextResponse.json({ ok: false, reason: "not found" }, { status: 404 });

  // Idempotent: only set clickedAt the first time.
  await prisma.trainingResult.updateMany({
    where: { id: result.id, clickedAt: null },
    data: { isHumanClicked: true, clickedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}