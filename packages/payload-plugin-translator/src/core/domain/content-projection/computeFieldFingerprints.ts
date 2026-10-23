import { createHash } from "node:crypto";

import type { FieldLike } from "../../kernel/field-traversal/types.js";

import { projectTranslatableContent } from "./contentProjector.js";

/**
 * A leaf's source hash. Branded so a recorded claim cannot be assigned where a hash is required
 * until the marker is ruled out. It gates assignment, not comparison.
 */
export type SourceHash = string & { readonly __brand: "SourceHash" };

/** Hash of each translatable leaf's source text, keyed by the leaf's `IdPath`. */
export type FieldFingerprints = Readonly<Record<string, SourceHash>>;

/**
 * Truncated sha256: a change detector, never a security token. Stored receipts are parsed against
 * this length, so changing it turns every existing receipt stale.
 */
export const HASH_LENGTH = 16;

export const SOURCE_HASH_PATTERN = new RegExp(`^[0-9a-f]{${HASH_LENGTH}}$`, "u");

const hashText = (text: string): SourceHash =>
  createHash("sha256").update(text).digest("hex").slice(0, HASH_LENGTH) as SourceHash;

export function computeFieldFingerprints(
  doc: Record<string, unknown>,
  schema: FieldLike[]
): FieldFingerprints {
  const hashes: Record<string, SourceHash> = {};
  for (const entry of projectTranslatableContent(doc, schema)) {
    hashes[entry.idPath] = hashText(entry.text);
  }
  return hashes;
}
