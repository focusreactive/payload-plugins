import type { PasslePostPayload } from "./types";

import { passleFixturesByShortcode } from "./fixtures";

/**
 * Stands in for the real Passle API call (GET
 * /api/v2/passlesync/posts/{PostShortcode}). The real endpoint is read-only,
 * so a fixture is the only source this ever needs: there is nothing to
 * write back to, and no live tenancy to depend on for a demo.
 *
 * Returns null rather than throwing on a missing shortcode, so the caller
 * can decide how to report "Passle has no such post" without a try/catch.
 */
export async function fetchPasslePost(postShortcode: string): Promise<PasslePostPayload | null> {
  return await Promise.resolve(passleFixturesByShortcode[postShortcode] ?? null);
}
