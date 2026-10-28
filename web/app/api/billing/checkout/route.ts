import { NextResponse } from "next/server";

// TODO(Stripe): implement annual subscription via Stripe Checkout.
// Plan mapping: FREE=5 employees (trial), STANDARD=60,000 JPY/yr (100), BUSINESS=120,000 JPY/yr (300).
// On success, update Tenant.stripeCustomerId and Tenant.plan via webhook.
export async function POST() {
  return NextResponse.json({ error: "Stripe integration not yet implemented" }, { status: 501 });
}