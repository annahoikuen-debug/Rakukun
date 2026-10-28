import { describe, it, expect } from "vitest";
import { assertEmailMatchesTenant, isFreemail, planLimit } from "@/lib/domain-guard";

describe("domain-guard", () => {
  it("blocks freemail", () => {
    expect(isFreemail("user@gmail.com")).toBe(true);
    expect(isFreemail("user@company.co.jp")).toBe(false);
  });

  it("rejects mismatched domain", () => {
    expect(assertEmailMatchesTenant("a@other.co.jp", "company.co.jp")).not.toBeNull();
  });

  it("accepts matching domain", () => {
    expect(assertEmailMatchesTenant("a@company.co.jp", "company.co.jp")).toBeNull();
  });

  it("enforces plan limits", () => {
    expect(planLimit("FREE")).toBe(5);
    expect(planLimit("STANDARD")).toBe(100);
    expect(planLimit("BUSINESS")).toBe(300);
  });
});