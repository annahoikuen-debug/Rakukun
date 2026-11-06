import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// Do not throw at import time: routes degrade gracefully (503) when Stripe is
// not configured instead of failing every request with a 500 during build/load.
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2026-10-28.endive",
      // Register the app info for Stripe dashboard attribution.
      appInfo: {
        name: "Rakukun SecTraining",
        version: "0.1.0",
      },
    })
  : (null as unknown as Stripe);

// Annual plans (JPY). Amounts are in the currency's smallest unit (yen has no subunits,
// so the number below is the exact yen value).
export const STRIPE_PLANS: Record<string, { name: string; amount: number; limit: number }> = {
  STANDARD: {
    name: "スタンダード（年額）",
    amount: 60000, // ¥60,000 / year
    limit: 100,
  },
  BUSINESS: {
    name: "ビジネス（年額）",
    amount: 120000, // ¥120,000 / year
    limit: 300,
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;

export function planToStripePrice(plan: PlanKey): { amount: number; name: string } {
  const p = STRIPE_PLANS[plan];
  return { amount: p.amount, name: p.name };
}
