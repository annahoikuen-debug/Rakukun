import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize-html";

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    expect(sanitizeHtml("<p>hi</p><script>alert(1)</script>")).not.toContain("<script");
  });
  it("removes inline handlers", () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)" />')).not.toContain("onerror");
  });
  it("neutralizes javascript: urls", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });
  it("keeps benign html", () => {
    expect(sanitizeHtml("<p>Hello</p>")).toContain("<p>Hello</p>");
  });
});