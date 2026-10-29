// Simple in-memory sliding-window limiter (single instance / MVP).
// For multi-instance/serverless, swap for a shared store (e.g. Upstash Redis).
const attempts = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    attempts.set(key, arr);
    return false; // blocked
  }
  arr.push(now);
  attempts.set(key, arr);
  // Prune stale keys so the map cannot grow unboundedly.
  if (attempts.size > MAX_KEYS) {
    const cutoff = now - windowMs;
    for (const [k, v] of attempts.entries()) {
      const cleaned = v.filter((t) => t >= cutoff);
      if (cleaned.length === 0) attempts.delete(k);
      else attempts.set(k, cleaned);
    }
  }
  return true; // allowed
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}