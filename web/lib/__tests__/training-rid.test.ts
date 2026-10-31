import { describe, it, expect } from "vitest";

describe("training rid validation", () => {
  const valid = (rid: string) => rid.length >= 5 && rid.length <= 40 && /^[A-Za-z0-9_-]+$/.test(rid);

  it("accepts alphanumeric rid", () => {
    expect(valid("abc123")).toBe(true);
    expect(valid("R-123_45")).toBe(true);
  });
  it("rejects too short / too long", () => {
    expect(valid("abcd")).toBe(false);
    expect(valid("a".repeat(41))).toBe(false);
  });
  it("rejects non-alphanumeric", () => {
    expect(valid("abc<script>")).toBe(false);
    expect(valid("abc def")).toBe(false);
    expect(valid("")).toBe(false);
  });
});