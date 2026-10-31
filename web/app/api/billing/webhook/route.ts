import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/errors";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );
  } catch (err) {
    logError(err, { source: "stripe-webhook" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: record the event id first; a unique violation means it was
  // already processed — return 200 so Stripe stops retrying. If processing
  // fails below, we remove the marker so Stripe's retry can re-run it.
  let alreadyProcessed = false;
  try {
    await prisma.processedStripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      alreadyProcessed = true;
    } else {
      throw e;
    }
  }
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Resolve the real Stripe price id from the subscription (ad-hoc
        // price_data creates a price object that we can only read back here).
        let priceId: string | null = null;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            priceId = sub.items.data[0]?.price.id ?? null;
          } catch (e) {
            logError(e, { source: "stripe-webhook", step: "retrieve-subscription" });
          }
        }

        if (tenantId && plan) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
            },
          });
          await auditLog({
            userId: session.metadata?.userId ?? undefined,
            action: "billing.subscribe",
            entityType: "Tenant",
            entityId: tenantId,
            metadata: { plan, customerId, subscriptionId, priceId },
            tenantId,
          }).catch(() => {});
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          // Determine plan from metadata (set at checkout creation).
          const plan = sub.metadata?.plan ?? "FREE";
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan,
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id ?? null,
            },
          });
          await auditLog({
            action: "billing.subscription.updated",
            entityType: "Tenant",
            entityId: tenantId,
            metadata: { plan, status: sub.status },
            tenantId,
          }).catch(() => {});
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan: "FREE",
              stripeSubscriptionId: null,
              stripePriceId: null,
            },
          });
          await auditLog({
            action: "billing.subscription.canceled",
            entityType: "Tenant",
            entityId: tenantId,
            metadata: { plan: "FREE" },
            tenantId,
          }).catch(() => {});
        }
        break;
      }

      default:
        // Ignore other event types.
        break;
    }
  } catch (err) {
    logError(err, { source: "stripe-webhook", eventType: event.type });
    // Remove the idempotency marker so Stripe's retry can re-process this event.
    await prisma.processedStripeEvent
      .delete({ where: { id: event.id } })
      .catch(() => {});
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
