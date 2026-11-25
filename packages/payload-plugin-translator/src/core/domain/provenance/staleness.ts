import type { FieldFingerprints } from "../content-projection/computeFieldFingerprints.js";
import type { LeafAddress } from "../content-projection/idPath.js";

import { isOwed, leafVerdicts } from "./leafVerdicts.js";
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

export function changedLeaves(
  recorded: RecordedFingerprints,
  currentFields: FieldFingerprints
): ChangedLeaves {
  const verdicts = leafVerdicts(recorded, currentFields);
  return Object.fromEntries(
    Object.entries(verdicts).map(([address, verdict]) => [address, isOwed(verdict)])
  );
}

export function driftedAddresses(
  recorded: RecordedFingerprints,
  currentFields: FieldFingerprints
): LeafAddress[] {
  return Object.entries(leafVerdicts(recorded, currentFields))
    .filter(([, verdict]) => isOwed(verdict))
    .map(([address]) => address);
}
