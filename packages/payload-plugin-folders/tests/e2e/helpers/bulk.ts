import { spawnSync } from "node:child_process";
import path from "node:path";

import type { APIRequestContext, Page } from "@playwright/test";

import { countIn } from "./content.js";

/**
 * Adds `count` draft pages to a folder of the end-to-end database with the dev app's draft seed
 * (`npm run seed:drafts`): the pages are written without the plugin's hooks, because 2,000 hooked
 * creates take minutes. A Local API run is a second process on the same SQLite file, as the
 * global setup's seed is.
 */
export const addDraftPages = async (
  request: APIRequestContext,
  folder: number,
  count: number
): Promise<void> => {
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (!databaseDirectory) {
    throw new Error("FOLDERS_E2E_DATABASE_DIRECTORY is not set: playwright.config.ts sets it");
  }
  // A run beside the live dev server has ended short of its count now and then, so the seed (which
  // only adds what is missing) runs again until the folder holds every page.
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const result = spawnSync("npm", ["run", "seed:drafts"], {
      encoding: "utf-8",
      env: {
        ...process.env,
        DATABASE_URI: `file:${path.join(databaseDirectory, "e2e.db")}`,
        DRAFT_PAGES_COUNT: String(count),
        DRAFT_PAGES_FOLDER: String(folder),
        DRAFT_PAGES_PREFIX: "draft",
      },
      timeout: 280_000,
    });
    if (result.status !== 0) {
      throw new Error(`The draft page seed failed:\n${result.stdout}\n${result.stderr}`);
    }
    if ((await countIn(request, { collection: "pages", folder })) >= count) {
      return;
    }
  }
  throw new Error(`Folder ${folder} still has fewer than ${count} pages after six seed runs`);
};

type Deferred = { promise: Promise<void>; resolve: () => void };

const deferred = (): Deferred => {
  const gate = {} as Deferred;
  gate.promise = new Promise<void>((resolve) => {
    gate.resolve = resolve;
  });

  return gate;
};

/**
 * Holds the operation step requests the page sends at the given positions (1 is the first step the
 * page sends, counting on across reloads) until they are released, so a test can look at the
 * dialog, the banner or a reload between two steps instead of racing the server.
 */
export const holdSteps = async (
  page: Page,
  positions: readonly number[]
): Promise<{
  release: (position: number) => void;
  waitUntilHeld: (position: number) => Promise<void>;
}> => {
  const gates = new Map<
    number,
    {
      held: Deferred;
      released: Deferred;
    }
  >();
  for (const position of positions) {
    gates.set(position, {
      held: deferred(),
      released: deferred(),
    });
  }
  let seen = 0;
  await page.route("**/api/folders-tree/operations/*/step", async (route) => {
    seen += 1;
    const gate = gates.get(seen);
    if (gate) {
      gate.held.resolve();
      await gate.released.promise;
    }
    try {
      await route.continue();
    } catch {
      // The page reloaded while the request was held: the request is gone, which is the point.
    }
  });

  const gateOf = (position: number) => {
    const gate = gates.get(position);
    if (!gate) {
      throw new Error(`No step is held at position ${position}`);
    }

    return gate;
  };

  return {
    release: (position) => gateOf(position).released.resolve(),
    waitUntilHeld: (position) => gateOf(position).held.promise,
  };
};
