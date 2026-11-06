const DEFAULT_FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.co.jp", "yahoo.co", "hotmail.com", "outlook.com",
  "hotmail.co.jp", "live.jp", "icloud.com", "me.com", "aol.com", "protonmail.com",
  "proton.me", "mail.ru", "yandex.ru", "zoho.com", "gmx.com", "duck.com", "example.com",
]);

const DEFAULT_PLAN_LIMITS: Record<string, number> = {
  FREE: 5,
  STANDARD: 100,
  BUSINESS: 300,
};

// Tenant-scoped overrides are resolved per-request and returned rather than
// stored in module-level mutable state. This prevents tenant A's freemail /
// plan-limit configuration from leaking into tenant B's concurrent requests
// in the same Next.js server process.
export interface DomainGuardConfig {
  freemail: Set<string>;
  planLimits: Record<string, number>;
}

export function getDefaultDomainGuardConfig(): DomainGuardConfig {
  return {
    freemail: DEFAULT_FREEMAIL_DOMAINS,
    planLimits: DEFAULT_PLAN_LIMITS,
  };
}

// Load tenant-scoped overrides from the database when an org context is
// available. Falls back to the defaults above otherwise. Returns a fresh
// config object per call so callers cannot mutate shared state.
export async function loadDomainGuardConfig(tenantId?: string): Promise<DomainGuardConfig> {
  const config = getDefaultDomainGuardConfig();
  if (!tenantId) return config;
  try {
    const { prisma } = await import("@/lib/prisma");
    const [freemailRows, planRows] = await Promise.all([
      prisma.tenantDomainConfig.findMany({ where: { tenantId, type: "FREEMAIL" } }),
      prisma.tenantPlanLimit.findMany({ where: { tenantId } }),
    ]);
    if (freemailRows.length) {
      config.freemail = new Set(freemailRows.map((r) => String(r.value)));
    }
    if (planRows.length) {
      config.planLimits = {
        ...DEFAULT_PLAN_LIMITS,
        ...Object.fromEntries(planRows.map((r) => [String(r.plan), Number(r.limit)])),
      };
    }
  } catch {
    // Keep defaults if config tables are not yet migrated or query fails.
  }
  return config;
}

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

export function isFreemail(email: string): boolean {
  return DEFAULT_FREEMAIL_DOMAINS.has(emailDomain(email));
}

export function planLimit(plan: string): number {
  return DEFAULT_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS.FREE;
}

// Returns null when valid, or an error message.
export function assertEmailMatchesTenant(email: string, tenantDomain: string | null | undefined): string | null {
  const domain = emailDomain(email);
  if (!domain) return "メールアドレスが不正です";
  if (isFreemail(email)) return "フリーメールアドレスは利用できません";
  if (tenantDomain && domain !== tenantDomain.toLowerCase()) {
    return `登録可能なドメインは @${tenantDomain} のみです`;
  }
  return null;
}
