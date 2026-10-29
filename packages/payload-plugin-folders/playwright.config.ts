import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const port = 4078;

// Playwright loads this file in the runner and in every worker; the environment variable makes
// all of them agree on one temporary database directory.
process.env.FOLDERS_E2E_DATABASE_DIRECTORY ??= mkdtempSync(path.join(tmpdir(), "folders-e2e-"));
const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalTeardown: "./tests/e2e/globalTeardown.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: process.env.CI ? "github" : "list",
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.spec.ts",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    // The PID file lets anyone stop this server by that PID alone, never by process name.
    command: "mkdir -p .run && echo $$ > .run/next-dev.pid && exec npm run dev",
    env: { DATABASE_URI: `file:${path.join(databaseDirectory, "e2e.db")}` },
    // A reused server would be pointing at some other database.
    reuseExistingServer: false,
    timeout: 180_000,
    url: `http://localhost:${port}/admin`,
  },
  workers: 1,
});
