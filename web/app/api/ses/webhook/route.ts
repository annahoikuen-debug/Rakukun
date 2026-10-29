import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { verify } from "crypto";

// Amazon SES Email Event Notification Webhook.
// Receives Bounce / Complaint / Delivery events from Amazon SNS (subscribed to SES
// topics) and persists them so delivery reputation can be monitored and offending
// recipients suppressed. SES sends a JSON body; the first request is an SNS
// subscription confirmation (must be confirmed via SubscribeURL).
//
// Security: SNS message signature verification is enforced in production per AWS docs:
// https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.verify.signature.html
// Skip only when env SES_SKIP_SIGNATURE_VERIFY=true (dev convenience, default false).

async function fetchSubscribeURL(subscribeURL: string): Promise<void> {
  const res = await fetch(subscribeURL, { method: "GET" });
  if (!res.ok) {
    throw new Error(`SubscribeURL confirmation failed: ${res.status}`);
  }
}

// Canonical message construction per AWS SNS signature verification.
function canonicalMessage(message: Record<string, unknown>): string {
  const keys = Object.keys(message).sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(k + "\n" + String(message[k]) + "\n");
  }
  return parts.join("");
}

function base64UrlDecode(input: string): Buffer {
  // SNS signature is standard base64 (not url-safe), but be lenient.
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  return Buffer.from(base64, "base64");
}

async function verifySnsSignature(message: Record<string, unknown>): Promise<boolean> {
  const signingCertUrl = String(message.SigningCertURL ?? "");
  const signature = message.Signature ?? "";
  if (!signingCertUrl || !signature) return false;

  // Only allow HTTPS SNS cert URLs.
  let certUrl: URL;
  try {
    certUrl = new URL(signingCertUrl);
  } catch {
    return false;
  }
  if (certUrl.protocol !== "https:") return false;
  if (!certUrl.hostname.endsWith(".amazonaws.com")) return false;

  const certPem = await fetch(certUrl.toString())
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");
  if (!certPem) return false;

  const canon = canonicalMessage(message);
  return verify("RSA-SHA1", Buffer.from(canon, "utf8"), certPem, base64UrlDecode(String(signature)));
}

export async function POST(req: Request) {
  // Rate limit by source IP to prevent webhook flooding.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`ses-webhook:${ip}`, 100, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));

  const skipVerify = process.env.SES_SKIP_SIGNATURE_VERIFY === "true";

  // SNS subscription confirmation
  if (body.Type === "SubscriptionConfirmation") {
    if (!skipVerify) {
      // Optionally fetch the SubscribeURL to confirm the subscription.
      try {
        await fetchSubscribeURL(String(body.SubscribeURL ?? ""));
      } catch {
        return NextResponse.json({ error: "subscription confirmation failed" }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: true, note: "subscription confirmation received" });
  }

  if (body.Type !== "Notification") {
    return NextResponse.json({ error: "unexpected SNS message type" }, { status: 400 });
  }

  // Verify SNS signature before processing any notification.
  if (!skipVerify) {
    const verified = await verifySnsSignature(body as Record<string, unknown>);
    if (!verified) {
      return NextResponse.json({ error: "unverified SNS message" }, { status: 401 });
    }
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
