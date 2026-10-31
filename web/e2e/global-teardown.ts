// Stops the embedded Postgres started in global-setup. Best-effort: on
// Windows the data directory can stay locked during shutdown, which must not
// fail the run (the next setup wipes the directory with retries anyway).
// Any process that survived stop() is force-killed so it cannot lock
// node_modules and break the next `npm ci`.
import { killEmbeddedPostgres } from "./fixtures";

export default async function globalTeardown() {
  const pg = (globalThis as Record<string, unknown>).__rakukunE2EPg as
    | { stop: () => Promise<void> }
    | undefined;
  delete (globalThis as Record<string, unknown>).__rakukunE2EPg;
  try {
    if (pg) await pg.stop();
  } catch (err) {
    console.warn("[e2e] embedded postgres stop() failed (ignored):", err);
  } finally {
    killEmbeddedPostgres();
  }
}
