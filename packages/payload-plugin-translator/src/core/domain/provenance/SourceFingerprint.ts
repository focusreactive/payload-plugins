// zod in `core` relaxes its dependency-free rule — decided in
// docs/plans/2026-10-02-per-field-fingerprints.task.md, "Deferred — validation in core".
import { z } from "zod";

import type { SourceHash } from "../content-projection/computeFieldFingerprints.js";
import { SOURCE_HASH_PATTERN } from "../content-projection/computeFieldFingerprints.js";
import type { LeafAddress } from "../content-projection/idPath.js";

/**
 * A leaf no run has answered — sent and never got back, or declined by an older version. It reads
 * as changed, so the next run selects it again.
 */
export const UNANSWERED = "!unanswered" as const;

export type RecordedClaim = SourceHash | typeof UNANSWERED;

/**
 * Keyed by leaf address, holding every leaf the run saw — sent or not. An absent address is a leaf
 * that appeared after the translation.
 */
export type RecordedFingerprints = Readonly<Record<LeafAddress, RecordedClaim>>;

const storedHash = z
  .string()
  .regex(SOURCE_HASH_PATTERN)
  .transform((hash) => hash as SourceHash);

/**
 * `null` is what 1.0.0-next.3 and earlier wrote for a leaf a run skipped. Read, not refused: one
 * value outside the schema degrades the whole map ({@link parseSourceFingerprint}).
 */
const legacyDecline = z.null().transform(() => UNANSWERED);
const recordedMap = z.record(z.union([storedHash, z.literal(UNANSWERED), legacyDecline]));

const asFieldMap = (stored: string): RecordedFingerprints | null => {
  try {
    const asMap = recordedMap.safeParse(JSON.parse(stored));
    return asMap.success ? asMap.data : null;
  } catch {
    return null;
  }
};

/**
 * `null` when the column claims nothing about any leaf: empty, not a per-leaf map (a pre-0.15.0
 * document digest included — docs/DEPRECATIONS.md#the-document-wide-digest-stops-being-read), or a
 * map with any value outside the schema, which fails whole rather than per leaf.
 */
export function parseSourceFingerprint(
  stored: string | null | undefined
): RecordedFingerprints | null {
  if (typeof stored !== "string" || stored.length === 0) return null;
  return asFieldMap(stored);
}

export function serializeSourceFingerprint(fingerprint: RecordedFingerprints): string {
  return JSON.stringify(fingerprint);
}
