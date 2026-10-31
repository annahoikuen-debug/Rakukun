import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { toOrgErrorStatus, toClientMessage } from "@/lib/errors";
import { encryptSecret, generateTotpSecret, totpUri } from "@/lib/mfa";
import { verifySecondFactor } from "@/lib/mfa-login";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;

  let membership;
  try {
    const r = await requireOrg(userId);
    membership = r.membership;
  } catch (e) {
    return NextResponse.json({ error: toClientMessage(e) }, { status: toOrgErrorStatus(e) });
  }
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Re-authentication guard: re-enrolling an ALREADY-enabled account requires
  // a valid current second factor, so a stolen session cannot silently reset
  // MFA and re-enroll it under an attacker-controlled secret.
  if (user.mfaEnabled) {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "");
    const reAuthed = await verifySecondFactor(user.id, user.mfaSecret, token);
    if (!reAuthed) {
      return NextResponse.json(
        { error: "MFA is already enabled; provide a valid current code to re-enroll." },
        { status: 403 },
      );
    }
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: encryptSecret(secret), mfaEnabled: false, mfaConfirmedAt: null },
  });

  const uri = totpUri(secret, "Rakukun", user.email);
  return NextResponse.json({ secret, uri });
}