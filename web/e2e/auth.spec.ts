// Auth-flow regression tests: sign-in, the MFA challenge, and the guarantee
// that a wrong password never reveals the second-factor field.
import { test, expect } from "@playwright/test";
import { totpAt } from "../lib/mfa";
import {
  E2E_MFA_EMAIL,
  E2E_MFA_SECRET,
  E2E_PASSWORD,
  E2E_USER_EMAIL,
} from "./fixtures";

const MFA_FIELD = "MFA code (6 digits or recovery code)";

test.describe("authentication", () => {
  test("wrong password shows an error and no MFA field", async ({ page }) => {
    await page.goto("/signin");
    await page.getByPlaceholder("Email").fill(E2E_USER_EMAIL);
    await page.getByPlaceholder("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("メールアドレスまたはパスワードが正しくありません")).toBeVisible();
    await expect(page.getByPlaceholder(MFA_FIELD)).toHaveCount(0);
    expect(page.url()).toContain("/signin");
  });

  test("valid credentials reach the dashboard", async ({ page }) => {
    await page.goto("/signin");
    await page.getByPlaceholder("Email").fill(E2E_USER_EMAIL);
    await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard**", { timeout: 10_000 });
    await expect(page.getByText("Rakukun").first()).toBeVisible();
  });

  test("MFA account is challenged for the second factor", async ({ page }) => {
    await page.goto("/signin");
    await page.getByPlaceholder("Email").fill(E2E_MFA_EMAIL);
    await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Password matched, so only now is the second-factor field revealed.
    await expect(page.getByPlaceholder(MFA_FIELD)).toBeVisible();
    await expect(page.getByText("二段階認証コードを入力してください")).toBeVisible();
    expect(page.url()).toContain("/signin");
  });

  test("MFA login with a valid TOTP code succeeds", async ({ page }) => {
    await page.goto("/signin");
    await page.getByPlaceholder("Email").fill(E2E_MFA_EMAIL);
    await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByPlaceholder(MFA_FIELD)).toBeVisible();
    await page.getByPlaceholder(MFA_FIELD).fill(totpAt(E2E_MFA_SECRET, Date.now()));
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard**", { timeout: 10_000 });
    await expect(page.getByText("Rakukun").first()).toBeVisible();
  });

  test("protected API returns 401 without a session", async ({ request }) => {
    const res = await request.get("/api/active-org");
    expect(res.status()).toBe(401);
  });
});
