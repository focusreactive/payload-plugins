import { createHash } from "node:crypto";

import type { CrossedPiece } from "./foldTranslatableContent.js";
import type { FieldContent } from "./translatableFields.js";
import type { LeafAddress } from "./idPath.js";

/**
 * A leaf's source hash. Branded so a recorded claim cannot be assigned where a hash is required
 * until the marker is ruled out. It gates assignment, not comparison.
 */
export type SourceHash = string & { readonly __brand: "SourceHash" };

/** Hash of each translatable leaf's source text, keyed by the leaf's `IdPath`. */
export type FieldFingerprints = Readonly<Record<LeafAddress, SourceHash>>;

/**
 * Truncated sha256: a change detector, never a security token. Stored receipts are parsed against
 * this length, so changing it turns every existing receipt stale.
 */
export const HASH_LENGTH = 16;

export const SOURCE_HASH_PATTERN = new RegExp(`^[0-9a-f]{${HASH_LENGTH}}$`, "u");

const hashText = (text: string): SourceHash =>
  createHash("sha256").update(text).digest("hex").slice(0, HASH_LENGTH) as SourceHash;

/**
 * Address and text are both length-prefixed, so no shift of the boundary can alias two pieces.
 */
const serialize = (piece: CrossedPiece): string =>
  `${piece.foundAt.length}:${piece.foundAt}=${piece.text.length}:${piece.text}`;

function byFoundAt(left: CrossedPiece, right: CrossedPiece): number {
  if (left.foundAt < right.foundAt) return -1;
  if (left.foundAt > right.foundAt) return 1;
  return 0;
}

const inStableOrder = (pieces: readonly CrossedPiece[]): CrossedPiece[] =>
  [...pieces].sort(byFoundAt);

const combineFixedWidth = (parts: readonly SourceHash[]): SourceHash => hashText(parts.join(""));

/**
 * A field with nothing below a crossing must keep hashing its own text bare: every receipt already
 * stored was written that way, and a different answer here marks every document stale.
 */
function hashOf(field: FieldContent): SourceHash {
  if (field.crossedIn.length === 0) return hashText(field.ownText);

  const pieces = inStableOrder(field.crossedIn).map((piece) => hashText(serialize(piece)));
  return combineFixedWidth([hashText(field.ownText), ...pieces]);
}

export function fingerprintFieldContents(fields: readonly FieldContent[]): FieldFingerprints {
  const hashes: Record<string, SourceHash> = {};
  for (const field of fields) {
    hashes[field.address] = hashOf(field);
  }
  return hashes;
}
