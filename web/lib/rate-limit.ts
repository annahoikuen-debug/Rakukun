// Shared rate-limit store.
// Uses Redis/Upstash when REDIS_URL is set, falling back to an in-memory
// Map for single-instance/dev use. The `redis` import is dynamic and
// optional so the build never breaks when the package is not installed.
// The module specifier is held in a variable (not a string literal) so
// TypeScript does not fail resolution when @upstash/redis is absent.
const REDIS_MODULE = "@upstash/redis";

type RedisStore = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  del: (key: string) => Promise<void>;
};

let redisStore: RedisStore | null = null;
let redisEnabled = false;

async function loadRedis(): Promise<RedisStore | null> {
  if (redisEnabled) return redisStore;
  redisEnabled = true;
  if (!process.env.REDIS_URL) return null;
  try {
    const mod = (await import(/* webpackIgnore: true */ REDIS_MODULE)) as {
      Redis: new (opts: { url: string; token?: string }) => {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
        del: (key: string) => Promise<unknown>;
      };
    };
    const client = new mod.Redis({ url: process.env.REDIS_URL as string });
    // Wrap so the rest of the module keeps a uniform (ttlSeconds) signature.
    redisStore = {
      get: (key) => client.get(key),
      set: (key, value, ttlSeconds) => client.set(key, value, { ex: ttlSeconds }).then(() => undefined),
      del: (key) => client.del(key).then(() => undefined),
    };
    return redisStore;
  } catch {
    // redis package absent or misconfigured — fall back to in-memory.
    return null;
  }
}

// Simple in-memory sliding-window limiter (single instance / MVP).
const attempts = new Map<string, number[]>();
const MAX_KEYS = 10_000;

function memoryAllowed(key: string, limit: number, windowMs: number): boolean {
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

export async function rateLimit(key: string, limit = 5, windowMs = 60_000): Promise<boolean> {
  const store = await loadRedis();
  if (store) {
    const windowKey = `ratelimit:${key}`;
    const current = await store.get(windowKey);
    const count = current ? parseInt(current, 10) : 0;
    if (count >= limit) return false; // blocked
    await store.set(windowKey, String(count + 1), Math.ceil(windowMs / 1000));
    return true; // allowed
  }
  return memoryAllowed(key, limit, windowMs);
}

export async function clearAttempts(key: string): Promise<void> {
  attempts.delete(key);
  const store = await loadRedis();
  if (store) {
    try { await store.del(`ratelimit:${key}`); } catch { /* best-effort */ }
  }
}