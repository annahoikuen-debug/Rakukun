import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, clearAttempts } from "@/lib/rate-limit";
import { getScenario } from "@/lib/scenarios";

describe("rateLimit", () => {
  beforeEach(() => {
    clearAttempts("key");
  });

  it("allows up to limit per window", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("key")).toBe(true);
    expect(rateLimit("key")).toBe(false);
  });

  it("resets after window", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("key", 5, 10)).toBe(true);
    expect(rateLimit("key", 5, 10)).toBe(false);
    // simulate window passed by clearing
    clearAttempts("key");
    expect(rateLimit("key", 5, 10)).toBe(true);
  });

  it("keys are independent", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("a")).toBe(true);
    expect(rateLimit("a")).toBe(false);
    expect(rateLimit("b")).toBe(true);
  });
});

describe("scenarios", () => {
  it("returns valid scenarios", () => {
    expect(getScenario("delivery").html).toContain("{{.URL}}");
    expect(getScenario("nonexistent")).toBe(getScenario("delivery"));
    for (const s of ["delivery", "sso-expiry", "security-update", "invoice", "meeting"]) {
      expect(getScenario(s).key).toBe(s);
    }
  });
});