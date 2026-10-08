import { createHash } from "node:crypto";

import type { FieldLike } from "../../kernel/field-traversal/types.js";

import { projectTranslatableContent } from "./contentProjector.js";

/** Hash of each translatable leaf's source text, keyed by the leaf's `IdPath`. */
export type FieldFingerprints = Readonly<Record<string, string>>;

/** Truncated sha256: a change detector between two states of one leaf, never a security token. */
const HASH_LENGTH = 16;

const hashText = (text: string): string =>
  createHash("sha256").update(text).digest("hex").slice(0, HASH_LENGTH);

export function computeFieldFingerprints(
  doc: Record<string, unknown>,
  schema: FieldLike[]
): FieldFingerprints {
  const hashes: Record<string, string> = {};
  for (const entry of projectTranslatableContent(doc, schema)) {
    hashes[entry.idPath] = hashText(entry.text);
  }
  return hashes;
}
