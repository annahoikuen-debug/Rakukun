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

// Tenant-scoped overrides are intentionally not persisted to the database.
// Row-Level Security was dropped in favor of app-layer tenantId filtering
// (see web/lib/org.ts requireOrg), so domain-guard uses the hardcoded defaults
// below. Keep this function signature for future per-tenant config loading.
export async function loadDomainGuardConfig(_tenantId?: string): Promise<DomainGuardConfig> {
  return getDefaultDomainGuardConfig();
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
