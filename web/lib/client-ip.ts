// Resolve a trusted client IP from request headers.
//
// We deliberately do NOT trust the first entry of X-Forwarded-For, which can
// be spoofed by the client. Instead we prefer a proxy-injected X-Real-IP
// header, falling back to the *last* (right-most) hop of X-Forwarded-For,
// which is the one added by the trusted proxy in front of the app.
//
// TRUSTED_PROXY_COUNT (default 1) controls how many trailing hops we skip
// when reading X-Forwarded-For, so deployments behind multiple proxies can
// tune it. A value of 0 means "use the last hop".
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) {
      const count = Math.max(0, Number(process.env.TRUSTED_PROXY_COUNT ?? "0"));
      const index = Math.max(0, hops.length - 1 - count);
      return hops[index] ?? hops[hops.length - 1] ?? "unknown";
    }
  }

  return "unknown";
}