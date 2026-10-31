// Boots a disposable embedded Postgres, applies migrations (validating that
// prisma/migrations matches schema.prisma on every run) and seeds the users
// the auth specs rely on. The cluster is stopped in global-teardown.
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import EmbeddedPostgres from "embedded-postgres";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { encryptSecret } from "../lib/mfa";
import {
  E2E_DB_NAME,
  E2E_DB_PORT,
  E2E_DB_URL,
  E2E_ENCRYPTION_SECRET,
  E2E_MFA_EMAIL,
  E2E_MFA_SECRET,
  E2E_PASSWORD,
  E2E_USER_EMAIL,
  killEmbeddedPostgres,
} from "./fixtures";

const dataDir = path.join(os.tmpdir(), "rakukun-e2e-pg");
const webRoot = path.join(__dirname, "..");

export default async function globalSetup() {
  // A previous run's orphan would hold the data dir and the postgres binary
  // lock — clear it before wiping.
  killEmbeddedPostgres();

  // Fresh cluster every run so seeds and migrations are deterministic.
  // Windows can keep temp files briefly locked after a previous run, so retry.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
      break;
    } catch (err) {
      if (attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "password",
    port: E2E_DB_PORT,
    // Keep files on stop: deleting them during shutdown races Windows file
    // locks (EBUSY). The data dir is wiped with retries at the next setup.
    persistent: true,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(E2E_DB_NAME);

  // Shared with global-teardown (both run in the Playwright runner process).
  (globalThis as Record<string, unknown>).__rakukunE2EPg = pg;

  process.env.DATABASE_URL = E2E_DB_URL;
  process.env.GOPHISH_KEY_ENCRYPTION_SECRET = E2E_ENCRYPTION_SECRET;

  execSync("npx prisma migrate deploy", {
    cwd: webRoot,
    env: process.env,
    stdio: "inherit",
  });

  const prisma = new PrismaClient();
  const passwordHash = bcrypt.hashSync(E2E_PASSWORD, 10);

  try {
    const tenant = await prisma.tenant.create({
      data: { name: "E2E Org", slug: "e2e-org" },
    });

    // Plain user: MEMBER (dashboard works, MFA not gated for this role).
    const plainUser = await prisma.user.create({
      data: { email: E2E_USER_EMAIL, name: "E2E User", passwordHash },
    });
    await prisma.membership.create({
      data: { userId: plainUser.id, tenantId: tenant.id, role: "MEMBER" },
    });

    // MFA user: OWNER (would be gated to /mfa-required without mfaEnabled).
    const mfaUser = await prisma.user.create({
      data: {
        email: E2E_MFA_EMAIL,
        name: "E2E MFA User",
        passwordHash,
        mfaEnabled: true,
        mfaSecret: encryptSecret(E2E_MFA_SECRET),
        mfaConfirmedAt: new Date(),
      },
    });
    await prisma.membership.create({
      data: { userId: mfaUser.id, tenantId: tenant.id, role: "OWNER" },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log(`[e2e] postgres ready on :${E2E_DB_PORT}, migrations applied, users seeded`);
}
