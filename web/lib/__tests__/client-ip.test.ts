import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clientIp } from "@/lib/client-ip";

function h(entries: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(entries)) h.set(k, v);
  return h;
}

const origEnv = process.env.TRUSTED_PROXY_COUNT;

beforeEach(() => {
  delete process.env.TRUSTED_PROXY_COUNT;
});

afterEach(() => {
  if (origEnv === undefined) delete process.env.TRUSTED_PROXY_COUNT;
  else process.env.TRUSTED_PROXY_COUNT = origEnv;
});

describe("clientIp", () => {
  it("returns unknown when no trusted proxy configured (headers are spoofable)", () => {
    expect(clientIp(h({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" }))).toBe("unknown");
    expect(clientIp(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("unknown");
  });

  it("prefers x-real-ip when trusted proxy count is 1", () => {
    process.env.TRUSTED_PROXY_COUNT = "1";
    expect(clientIp(h({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("uses the last trusted hop when trusted proxy count is 1", () => {
    process.env.TRUSTED_PROXY_COUNT = "1";
    expect(clientIp(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("10.0.0.1");
  });

  it("returns unknown when no headers", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });

  it("trims whitespace", () => {
    process.env.TRUSTED_PROXY_COUNT = "1";
    expect(clientIp(h({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8 " }))).toBe("5.6.7.8");
  });
});
