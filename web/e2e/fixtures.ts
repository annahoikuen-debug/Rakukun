// Shared constants for the E2E stack: an embedded Postgres (started by
// global-setup) plus the production Next.js build served on a dedicated port
// so a developer's dev server on :3000 is never hijacked.
import { execSync } from "child_process";

export const E2E_DB_PORT = 5433;
export const E2E_DB_NAME = "rakukun_e2e";
export const E2E_DB_URL = `postgresql://postgres:password@localhost:${E2E_DB_PORT}/${E2E_DB_NAME}?schema=public`;

export const E2E_APP_PORT = 3100;
export const E2E_APP_ORIGIN = `http://localhost:${E2E_APP_PORT}`;

// Test-only credentials. These must be >= 32 chars (crypto.ts requirement).
export const E2E_ENCRYPTION_SECRET = "e2e-encryption-secret-0123456789abcdef";
export const E2E_AUTH_SECRET = "e2e-auth-secret-e2e-auth-secret-e2e-32chars";

export const E2E_PASSWORD = "E2ePassw0rd!";
export const E2E_USER_EMAIL = "e2e-user@example.com"; // no MFA
export const E2E_MFA_EMAIL = "e2e-mfa@example.com"; // MFA enabled, OWNER
// Fixed TOTP secret so specs can compute codes without reading the DB.
export const E2E_MFA_SECRET = "JBSWY3DPEHPK3PXP";

/**
 * Force-kill leftover embedded-postgres processes (Windows only).
 *
 * `pg_ctl stop` occasionally leaves an orphan on Windows; it then holds a
 * lock on node_modules/.../postgres.exe and the next `npm ci` fails with
 * EPERM. Called before wiping the cluster (setup) and after stop()
 * (teardown) so each run starts and ends clean. Best-effort by design.
 */
export function killEmbeddedPostgres(): number {
  if (process.platform !== "win32") return 0;
  try {
    const listScript =
      "Get-CimInstance Win32_Process -Filter \"Name LIKE 'postgres%'\" | " +
      "Where-Object { $_.CommandLine -like '*embedded-postgres*' } | " +
      "ForEach-Object { $_.ProcessId }";
    const listed = execSync(
      `powershell -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(listScript, "utf16le").toString("base64")}`,
      { encoding: "utf8", stdio: "pipe" }
    );
    const pids = listed
      .split(/\s+/)
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (pids.length === 0) return 0;

    const killScript = pids
      .map((p) => `Stop-Process -Id ${p} -Force -ErrorAction SilentlyContinue`)
      .join("; ");
    execSync(
      `powershell -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(killScript, "utf16le").toString("base64")}`,
      { stdio: "pipe" }
    );
    console.log(`[e2e] force-killed leftover postgres pid(s): ${pids.join(", ")}`);
    return pids.length;
  } catch {
    return 0;
  }
}
