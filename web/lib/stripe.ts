import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_build_placeholder", {
  apiVersion: "2026-10-28.endive",
  // Register the app info for Stripe dashboard attribution.
  appInfo: {
    name: "Rakukun SecTraining",
    version: "0.1.0",
  },
});

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
