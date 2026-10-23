import type { FieldFingerprints } from "../content-projection/computeFieldFingerprints.js";

import type { ProvenanceReceipt } from "./ProvenanceStore.interface.js";

import type { RecordedFingerprints, SourceFingerprint } from "./SourceFingerprint.js";

/** One entry per translatable leaf the source has now. */
export type ChangedLeaves = Readonly<Record<string, boolean>>;

export type CurrentFingerprint = {
  document: string;
  fields: FieldFingerprints;
};

const sameFields = (stored: RecordedFingerprints, current: FieldFingerprints): boolean => {
  const addresses = Object.keys(stored);
  return (
    addresses.length === Object.keys(current).length &&
    addresses.every((address) => stored[address] === current[address])
  );
};

const describesCurrentSource = (
  fingerprint: SourceFingerprint | null,
  current: CurrentFingerprint
): boolean => {
  if (fingerprint === null) return false;

  switch (fingerprint.kind) {
    case "document":
      return fingerprint.hash === current.document;
    case "fields":
      return sameFields(fingerprint.hashes, current.fields);
  }
};

/** Out of date unless the receipt — or the editor's dismissal — describes the source as it stands now. */
export function isRecordStale(record: ProvenanceReceipt, current: CurrentFingerprint): boolean {
  return (
    !describesCurrentSource(record.sourceFingerprint, current) &&
    !describesCurrentSource(record.dismissedFingerprint, current)
  );
}

export const recordsEachLeaf = (
  fingerprint: SourceFingerprint | null
): fingerprint is { kind: "fields"; hashes: RecordedFingerprints } => {
  return fingerprint?.kind === "fields";
};

/**
 * A leaf the receipt never recorded counts as changed: a leaf empty at the last run was not
 * recorded, and would otherwise never be translated again.
 */
export function changedLeaves(
  recorded: RecordedFingerprints,
  currentFields: FieldFingerprints
): ChangedLeaves {
  const claims = new Map(Object.entries(recorded));

  const answers: Record<string, boolean> = {};
  for (const [address, current] of Object.entries(currentFields)) {
    answers[address] = claims.get(address) !== current;
  }
  return answers;
}
