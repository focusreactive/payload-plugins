import type { FieldFingerprints } from "../content-projection/computeFieldFingerprints.js";
import type { LeafAddress } from "../content-projection/idPath.js";

import type { ProvenanceReceipt } from "./ProvenanceStore.interface.js";

import type { RecordedFingerprints } from "./SourceFingerprint.js";

/** One entry per translatable leaf the source has now. */
export type ChangedLeaves = Readonly<Record<LeafAddress, boolean>>;

const sameFields = (stored: RecordedFingerprints, current: FieldFingerprints): boolean => {
  const addresses = Object.keys(stored);
  return (
    addresses.length === Object.keys(current).length &&
    addresses.every((address) => stored[address] === current[address])
  );
};

export function isRecordStale(
  record: ProvenanceReceipt,
  currentFields: FieldFingerprints
): boolean {
  const recorded = record.sourceFingerprint;
  return recorded === null || !sameFields(recorded, currentFields);
}

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

export function driftedAddresses(
  recorded: RecordedFingerprints,
  currentFields: FieldFingerprints
): LeafAddress[] {
  const moved = changedLeaves(recorded, currentFields);
  return Object.keys(moved).filter((address) => moved[address]);
}
