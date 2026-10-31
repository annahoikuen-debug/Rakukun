import { test, expect } from "@playwright/test";

// Security-focused E2E smoke checks.
// Full auth/MFA flows require a seeded DB + running app; here we assert the
// public-facing security invariants that do not need authentication.

test.describe("security invariants", () => {
  test("protected dashboard redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    // Either a redirect to /signin or a 401/302.
    expect(page.url()).toContain("/signin");
  });

  test("security headers are present on the landing page", async ({ page }) => {
    const res = await page.goto("/");
    const headers = res?.headers() ?? {};
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  test("training endpoint rejects malformed rid", async ({ request }) => {
    const res = await request.post("/api/training/track-human-click", {
      data: { rid: "<script>" },
    });
    expect(res.status()).toBe(400);
  });
});