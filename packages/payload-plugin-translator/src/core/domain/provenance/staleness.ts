import type { FieldFingerprints } from "../content-projection/computeFieldFingerprints.js";

import type { ProvenanceReceipt } from "./ProvenanceStore.interface.js";
import type { RecordedFingerprints, SourceFingerprint } from "./SourceFingerprint.js";

/** Per-leaf drift. An absent address means nothing could be determined — never "unchanged" ({@link leafSourceChanged}). */
export type ChangedLeaves = Readonly<Record<string, boolean>>;

export type CurrentFingerprint = {
  document: string;
  fields: FieldFingerprints;
};

/** The hash a receipt entry claims, or `undefined` when it claims none. Positive test on purpose: a stored value neither reader understands must claim nothing, never drift. */
const claimedHash = (recorded: string | null | undefined): string | undefined =>
  typeof recorded === "string" ? recorded : undefined;

const sameAddresses = (stored: RecordedFingerprints, current: FieldFingerprints): boolean =>
  Object.keys(stored).length === Object.keys(current).length &&
  Object.keys(stored).every((address) => address in current);

const matchesClaim = (
  recorded: string | null | undefined,
  current: string | undefined
): boolean => {
  const claimed = claimedHash(recorded);
  return claimed === undefined || claimed === current;
};

const sameFields = (stored: RecordedFingerprints, current: FieldFingerprints): boolean =>
  sameAddresses(stored, current) &&
  Object.entries(stored).every(([address, recorded]) => matchesClaim(recorded, current[address]));

const describesCurrentSource = (
  fingerprint: SourceFingerprint | null,
  current: CurrentFingerprint
): boolean => {
  if (fingerprint === null) return false;
  return fingerprint.kind === "document"
    ? fingerprint.hash === current.document
    : sameFields(fingerprint.hashes, current.fields);
};

/**
 * The #50 staleness rule in one place: out of date unless the receipt — or the editor's dismissal —
 * describes the source as it stands now. Dismissing stores the current fingerprint, so the flag
 * returns only when the source moves again.
 */
export function isRecordStale(record: ProvenanceReceipt, current: CurrentFingerprint): boolean {
  return (
    !describesCurrentSource(record.sourceFingerprint, current) &&
    !describesCurrentSource(record.dismissedFingerprint, current)
  );
}

export const recordsEachLeaf = (
  fingerprint: SourceFingerprint | null
): fingerprint is { kind: "fields"; hashes: RecordedFingerprints } =>
  fingerprint?.kind === "fields";

/** `undefined` means *cannot tell* — callers must claim nothing; answering `true` on a guess overwrites a translation. */
export function leafSourceChanged(
  recorded: RecordedFingerprints,
  currentFields: FieldFingerprints,
  address: string
): boolean | undefined {
  const translatedFrom = claimedHash(recorded[address]);
  if (translatedFrom === undefined) return undefined;
  return translatedFrom !== currentFields[address];
}

export function changedLeaves(
  stored: SourceFingerprint | null,
  currentFields: FieldFingerprints
): ChangedLeaves {
  if (!recordsEachLeaf(stored)) return {};

  const addressesTheReceiptSaw = Object.keys(stored.hashes);
  const answers: Record<string, boolean> = {};
  for (const address of addressesTheReceiptSaw) {
    const changed = leafSourceChanged(stored.hashes, currentFields, address);
    if (changed !== undefined) answers[address] = changed;
  }
  return answers;
}
