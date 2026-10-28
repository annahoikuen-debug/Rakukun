// Simple in-memory sliding-window limiter (single instance / MVP).
// For multi-instance/serverless, swap for a shared store (e.g. Upstash Redis).
const attempts = new Map<string, number[]>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    attempts.set(key, arr);
    return false; // blocked
  }
  arr.push(now);
  attempts.set(key, arr);
  return true; // allowed
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}