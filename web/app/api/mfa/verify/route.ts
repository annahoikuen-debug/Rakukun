import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { toOrgErrorStatus, toClientMessage } from "@/lib/errors";
import { decryptSecret, verifyTotp, generateRecoveryCodes } from "@/lib/mfa";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;

  try {
    await requireOrg(userId);
  } catch (e) {
    return NextResponse.json({ error: toClientMessage(e) }, { status: toOrgErrorStatus(e) });
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.mfaSecret) return NextResponse.json({ error: "MFA not set up" }, { status: 400 });

  const secret = decryptSecret(user.mfaSecret);
  if (!verifyTotp(secret, token)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const { plain, hashed } = generateRecoveryCodes(8);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaConfirmedAt: new Date() },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
    ...hashed.map((h) =>
      prisma.mfaRecoveryCode.create({ data: { userId, codeHash: h } }),
    ),
  ]);

  return NextResponse.json({ ok: true, recoveryCodes: plain });
}