import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { toOrgErrorStatus, toClientMessage } from "@/lib/errors";
import { decryptSecret, verifyTotp, generateRecoveryCodes } from "@/lib/mfa";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;

  // Throttle MFA verification to prevent TOTP brute force / re-enrollment takeover.
  if (!(await rateLimit(`mfa-verify:${userId}`, 5, 60_000))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

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