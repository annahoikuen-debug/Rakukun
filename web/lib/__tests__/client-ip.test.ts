import { describe, it, expect } from "vitest";
import { clientIp } from "@/lib/client-ip";

function h(entries: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(entries)) h.set(k, v);
  return h;
}

describe("clientIp", () => {
  it("prefers x-real-ip", () => {
    expect(clientIp(h({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("ignores spoofed leading hop and uses the last hop", () => {
    expect(clientIp(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("10.0.0.1");
  });
  it("returns unknown when no headers", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });
  it("trims whitespace", () => {
    expect(clientIp(h({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8 " }))).toBe("5.6.7.8");
  });
});