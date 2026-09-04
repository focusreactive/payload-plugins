/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/lib/talks/getReaderTier.ts
 *
 * Reads the tier the "view as" switch has selected, on the server.
 *
 * Why a helper and not a prop: RenderBlocks/renderContentBlock spreads a block's own fields into
 * its component and nothing else, so threading a `readerTier` prop down to TalkGrid would mean
 * editing the shared block renderer for one demo. Reading the cookie where it is needed keeps the
 * change additive, which is also what packages/ui and the block registry expect.
 *
 * Server-side by design. If the tier were read in the browser the gated body would already have
 * been sent, and "the paid body never leaves the server" is the property being demonstrated.
 */

import { cookies } from "next/headers";

import type { TalkTier } from "./applyTier";
import { isTalkTier } from "./applyTier";
import { VIEW_AS_COOKIE } from "./viewAsCookie";

export async function getReaderTier(): Promise<TalkTier> {
  const store = await cookies();
  const value = store.get(VIEW_AS_COOKIE)?.value;
  // Defaulting to `visitor` means an unset or tampered cookie shows the least, never the most.
  return isTalkTier(value) ? value : "visitor";
}
