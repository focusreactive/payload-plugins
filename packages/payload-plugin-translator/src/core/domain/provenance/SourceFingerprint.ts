import { z } from "zod";

/** A leaf the run saw and declined to translate: the target text is not ours to describe. */
export const DECLINED = null;

/**
 * What a receipt records about one leaf: the hash it was translated from, {@link DECLINED}, or — when
 * the address is absent altogether — a leaf that appeared after the translation.
 */
export type RecordedFingerprints = Readonly<Record<string, string | typeof DECLINED>>;

/**
 * What a receipt stores about the source it was translated from. `document` is the single sha256
 * written before per-leaf fingerprints existed: it says the document moved without saying where, so
 * no leaf-level question can be answered from it.
 */
export type SourceFingerprint =
  | { kind: "document"; hash: string }
  | { kind: "fields"; hashes: RecordedFingerprints };

// TODO(core-deps): zod in `core` relaxes its dependency-free rule — see the task contract,
// "Deferred — validation in core". Revisit if `@repo/translator-core` is ever extracted.
const recordedMap = z.record(z.string().nullable());

const asFieldMap = (stored: string): RecordedFingerprints | null => {
  try {
    const asMap = recordedMap.safeParse(JSON.parse(stored));
    return asMap.success ? asMap.data : null;
  } catch {
    return null;
  }
};

/**
 * Read a stored fingerprint. Anything that is not a per-field map is taken as the legacy document
 * digest — a corrupt value is deliberately not an error, it simply never matches. `null` only when
 * the column held nothing.
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
