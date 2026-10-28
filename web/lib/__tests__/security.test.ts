import { describe, it, expect } from "vitest";
import { pageSchema } from "@/lib/validators";
import { encrypt, decrypt } from "@/lib/crypto";

describe("pageSchema", () => {
  it("does not accept capture_credentials or capture_passwords fields", () => {
    const keys = Object.keys(pageSchema.shape);
    expect(keys).not.toContain("capture_credentials");
    expect(keys).not.toContain("capture_passwords");
  });

  it("validates a basic page", () => {
    const r = pageSchema.safeParse({ name: "p", html: "<html/>" });
    expect(r.success).toBe(true);
  });
});

describe("crypto", () => {
  it("round-trips", () => {
    process.env.GOPHISH_KEY_ENCRYPTION_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const blob = encrypt("secret-api-key");
    expect(blob).not.toBe("secret-api-key");
    expect(decrypt(blob)).toBe("secret-api-key");
  });
});