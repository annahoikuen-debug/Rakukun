import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Amazon SES Email Event Notification Webhook.
// Receives Bounce / Complaint / Delivery events from Amazon SNS (subscribed to SES
// topics) and persists them so delivery reputation can be monitored and offending
// recipients suppressed. SES sends a JSON body; the first request is an SNS
// subscription confirmation (must be confirmed via SubscribeURL).
//
// Security: validate the SNS Signature / SigningCertURL in production (AWS docs:
// https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.verify.signature.html).
// This MVP stubs signature verification; enable it before production use.

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // SNS subscription confirmation
  if (body.Type === "SubscriptionConfirmation") {
    // In production, fetch SubscribeURL to confirm the subscription.
    return NextResponse.json({ ok: true, note: "subscription confirmation received" });
  }

  if (body.Type !== "Notification") {
    return NextResponse.json({ error: "unexpected SNS message type" }, { status: 400 });
  }

  const message = body.Message;
  const msg = typeof message === "string" ? JSON.parse(message) : message;

  const eventType = msg.eventType; // "Bounce" | "Complaint" | "Delivery"
  const mail = msg.mail || {};
  const messageId = mail.messageId;
  const timestamp = msg.timestamp || new Date().toISOString();

  // Identify affected recipient(s)
  const bounce = msg.bounce || {};
  const complaint = msg.complaint || {};
  const recipients = (bounce.bouncedRecipients || complaint.complainedRecipients || [
    { emailAddress: mail.destination?.[0] },
  ]) as { emailAddress?: string }[];

  for (const r of recipients) {
    const email = r.emailAddress;
    if (!email) continue;

    // Persist event per recipient
    await prisma.sesEvent.create({
      data: {
        eventType,
        messageId,
        email,
        timestamp: new Date(timestamp),
        payload: JSON.stringify(msg),
      },
    });

    // Suppress hard bounces and complaints so they are not re-emailed.
    if (eventType === "Bounce" && bounce.bounceType === "Permanent") {
      await prisma.suppressedEmail.upsert({
        where: { email },
        update: { reason: "hard-bounce", updatedAt: new Date() },
        create: { email, reason: "hard-bounce" },
      });
    } else if (eventType === "Complaint") {
      await prisma.suppressedEmail.upsert({
        where: { email },
        update: { reason: "complaint", updatedAt: new Date() },
        create: { email, reason: "complaint" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
