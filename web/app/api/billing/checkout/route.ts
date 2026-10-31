import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { toOrgErrorStatus } from "@/lib/errors";
import { stripe, STRIPE_PLANS, planToStripePrice } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const orgId = await (await import("@/lib/org")).getActiveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  let org;
  try {
    const r = await requireOrg(userId, orgId);
    org = r.org;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: toOrgErrorStatus(e) });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const { plan } = body ?? {};
  if (!plan || !(plan in STRIPE_PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Prevent downgrade below current plan.
  const planOrder: Record<string, number> = { FREE: 0, STANDARD: 1, BUSINESS: 2 };
  if (planOrder[plan] <= planOrder[org.plan ?? "FREE"]) {
    return NextResponse.json({ error: "Already on this or a higher plan" }, { status: 400 });
  }

  const price = planToStripePrice(plan as keyof typeof STRIPE_PLANS);

  // Create or reuse Stripe customer.
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user?.email ?? undefined,
      name: org.name,
      metadata: { tenantId: org.id, orgName: org.name },
    });
    customerId = customer.id;
    await prisma.tenant.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create checkout session (annual recurring).
  const sessionCheckout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: {
            name: price.name,
            description: `Rakukun ${plan} annual subscription`,
          },
          unit_amount: price.amount,
          recurring: { interval: "year" },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard/settings?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard/settings`,
    metadata: {
      tenantId: org.id,
      plan,
      userId,
    },
    subscription_data: {
      metadata: {
        tenantId: org.id,
        plan,
        userId,
      },
    },
  });

  return NextResponse.json({ url: sessionCheckout.url });
}
