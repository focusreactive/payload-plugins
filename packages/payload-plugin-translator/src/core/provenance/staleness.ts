import type { TranslationProvenanceRecord } from "./ProvenanceStore.interface";

/**
 * Whether a translated locale is out of date relative to its source — the #50 rule, in one place.
 *
 * A record is stale when the current source fingerprint differs from the one the translation was
 * derived from (`record.sourceFingerprint`) **and** the editor has not acknowledged that exact drift
 * (`record.dismissedFingerprint`). Dismissing sets `dismissedFingerprint` to the current fingerprint,
 * so the indicator hides until the source changes again (a new fingerprint no longer matches the
 * dismissed one). `dismissedFingerprint` is `null` until the first dismiss, in which case the check
 * reduces to a plain source-drift comparison.
 *
 * Pure and payload-free so the staleness contract is testable without a database; the server handler
 * supplies `currentFingerprint` via {@link computeSourceFingerprint} on the live source document.
 *
 * @param record - The stored provenance receipt for one `(collection, document, targetLocale)`.
 * @param currentFingerprint - `computeSourceFingerprint` of the source document right now.
 * @returns `true` when the target locale is out of date and not dismissed.
 */
export function isRecordStale(
  record: TranslationProvenanceRecord,
  currentFingerprint: string
): boolean {
  return (
    currentFingerprint !== record.sourceFingerprint &&
    currentFingerprint !== record.dismissedFingerprint
  );
}
