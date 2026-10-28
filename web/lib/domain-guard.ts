const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.co.jp", "yahoo.co", "hotmail.com", "outlook.com",
  "hotmail.co.jp", "live.jp", "icloud.com", "me.com", "aol.com", "protonmail.com",
  "proton.me", "mail.ru", "yandex.ru", "zoho.com", "gmx.com", "duck.com", "example.com",
]);

export const PLAN_LIMITS: Record<string, number> = {
  FREE: 5,
  STANDARD: 100,
  BUSINESS: 300,
};

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

export function isFreemail(email: string): boolean {
  return FREEMAIL_DOMAINS.has(emailDomain(email));
}

export function planLimit(plan: string): number {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
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