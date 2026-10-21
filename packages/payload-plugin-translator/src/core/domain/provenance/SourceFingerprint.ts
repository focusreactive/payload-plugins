// zod in `core` relaxes its dependency-free rule — decided in
// docs/plans/2026-10-02-per-field-fingerprints.task.md, "Deferred — validation in core".
import { z } from "zod";

import type { SourceHash } from "../content-projection/computeFieldFingerprints.js";
import { SOURCE_HASH_PATTERN } from "../content-projection/computeFieldFingerprints.js";

/** A leaf the run saw and declined to translate: the target text is not ours to describe. */
export const DECLINED = null;

/**
 * A leaf the run sent and never got back: it reads as changed, so the next run selects it again.
 */
export const UNANSWERED = "!unanswered" as const;

export type RecordedClaim = SourceHash | typeof UNANSWERED | typeof DECLINED;

/** Keyed by address. An absent address is a leaf that appeared after the translation. */
export type RecordedFingerprints = Readonly<Record<string, RecordedClaim>>;

/**
 * What a receipt stores about its source. `document` is the sha256 written before per-leaf
 * fingerprints, or any stored value that does not parse as a per-leaf map: it says the document
 * moved without saying where.
 */
export type SourceFingerprint =
  | { kind: "document"; hash: string }
  | { kind: "fields"; hashes: RecordedFingerprints };

const storedHash = z
  .string()
  .regex(SOURCE_HASH_PATTERN)
  .transform((hash) => hash as SourceHash);

const recordedMap = z.record(z.union([storedHash, z.literal(UNANSWERED), z.null()]));

const asFieldMap = (stored: string): RecordedFingerprints | null => {
  try {
    const asMap = recordedMap.safeParse(JSON.parse(stored));
    return asMap.success ? asMap.data : null;
  } catch {
    return null;
  }
};

/**
 * Anything that is not a per-field map — including a map with one value outside the schema — reads
 * as the legacy digest: deliberately not an error, it never matches and answers no leaf. The column
 * is plain text, so this parse is its only check. `null` only for an empty column.
 */
export function parseSourceFingerprint(
  stored: string | null | undefined
): SourceFingerprint | null {
  if (typeof stored !== "string" || stored.length === 0) return null;

  const hashes = asFieldMap(stored);
  return hashes === null ? { kind: "document", hash: stored } : { kind: "fields", hashes };
}

export function serializeSourceFingerprint(fingerprint: SourceFingerprint): string {
  return fingerprint.kind === "document" ? fingerprint.hash : JSON.stringify(fingerprint.hashes);
}
