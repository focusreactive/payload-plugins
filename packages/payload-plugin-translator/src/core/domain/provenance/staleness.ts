import type {
  FieldFingerprints,
  SourceHash,
} from "../content-projection/computeFieldFingerprints.js";

import type { ProvenanceReceipt } from "./ProvenanceStore.interface.js";

import type {
  RecordedClaim,
  RecordedFingerprints,
  SourceFingerprint,
} from "./SourceFingerprint.js";

/** One entry per address the receipt recorded, and no others. An address it never saw has no entry. */
export type ChangedLeaves = Readonly<Record<string, boolean>>;

export type CurrentFingerprint = {
  document: string;
  fields: FieldFingerprints;
};

/** `UNANSWERED` can never equal a hash, so one comparison answers for both kinds of claim. */
const leafChanged = (recorded: RecordedClaim, current: SourceHash | undefined): boolean => {
  return recorded !== current;
};

const sameFields = (stored: RecordedFingerprints, current: FieldFingerprints): boolean => {
  const addresses = Object.keys(stored);
  return (
    addresses.length === Object.keys(current).length &&
    addresses.every((address) => !leafChanged(stored[address], current[address]))
  );
};

const describesCurrentSource = (
  fingerprint: SourceFingerprint | null,
  current: CurrentFingerprint
): boolean => {
  if (fingerprint === null) return false;
  return fingerprint.kind === "document"
    ? fingerprint.hash === current.document
    : sameFields(fingerprint.hashes, current.fields);
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

export function changedLeaves(
  stored: SourceFingerprint | null,
  currentFields: FieldFingerprints
): ChangedLeaves {
  if (!recordsEachLeaf(stored)) return {};

  const answers: Record<string, boolean> = {};
  for (const [address, recorded] of Object.entries(stored.hashes)) {
    answers[address] = leafChanged(recorded, currentFields[address]);
  }
  return answers;
}
