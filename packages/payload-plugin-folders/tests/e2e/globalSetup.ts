import { spawnSync } from "node:child_process";
import path from "node:path";

/** Pages in the seed's archive folder: one full page of rows (100) and half of another. */
export const archivePageCount = 150;

/**
 * Seeds the end-to-end database with the dev app's own seed (`npm run seed`): the sandbox tree
 * of spec section 11.3 plus an `archive` folder of synthetic pages for the "Load more" cases.
 */
export default function globalSetup() {
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (!databaseDirectory) {
    throw new Error("FOLDERS_E2E_DATABASE_DIRECTORY is not set: playwright.config.ts sets it");
  }
  const result = spawnSync("npm", ["run", "seed"], {
    encoding: "utf-8",
    env: {
      ...process.env,
      DATABASE_URI: `file:${path.join(databaseDirectory, "e2e.db")}`,
      SEED_LARGE: String(archivePageCount),
    },
  });
  if (result.status !== 0) {
    throw new Error(`The e2e seed failed:\n${result.stdout}\n${result.stderr}`);
  }
}
