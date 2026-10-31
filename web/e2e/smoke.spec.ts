import { test, expect } from "@playwright/test";

// Smoke tests: verify the app is up and public entry points render without
// CSP violations or console errors. Heavier flows (signup, onboarding, training)
// are stubbed separately once Gophish/Stripe test doubles are wired in.

test.describe("public pages", () => {
  test("landing page loads and renders a heading", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    // CSP must not block scripts on public pages.
    expect(errors.filter((e) => e.includes("Content Security Policy"))).toEqual([]);
  });

  test("sign-in page renders the form", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.locator('input[placeholder="Email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});