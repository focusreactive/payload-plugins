import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { PasslePostPayload } from "./types";

const fixturesDirectoryUrl = new URL("./fixtures/", import.meta.url);

/**
 * Stands in for the real Passle API call (GET
 * /api/v2/passlesync/posts/{PostShortcode}). The real endpoint is read-only,
 * so a fixture file is the only source this ever needs: there is nothing to
 * write back to, and no live tenancy to depend on for a demo.
 *
 * Returns null rather than throwing on a missing shortcode, so the caller
 * can decide how to report "Passle has no such post" without a try/catch.
 */
export async function fetchPasslePost(postShortcode: string): Promise<PasslePostPayload | null> {
  const fixtureFileUrl = new URL(`${postShortcode}.json`, fixturesDirectoryUrl);

  try {
    const fixtureContents = await readFile(fileURLToPath(fixtureFileUrl), "utf-8");
    return JSON.parse(fixtureContents) as PasslePostPayload;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
