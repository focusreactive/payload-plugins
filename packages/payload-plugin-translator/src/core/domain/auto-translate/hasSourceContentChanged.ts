import type { FieldFingerprints } from "../content-projection/computeFieldFingerprints.js";
import type { SourceFingerprinter } from "../content-projection/sourceFingerprinter.js";

function sameFingerprints(before: FieldFingerprints, after: FieldFingerprints): boolean {
  const addresses = Object.keys(before);
  if (addresses.length !== Object.keys(after).length) return false;
  return addresses.every((address) => before[address] === after[address]);
}

/**
 * Whether a source-locale save changed translatable content.
 *
 * Answers "changed" when there is nothing to compare: a create, or a collection this plugin does
 * not translate.
 */
export function hasSourceContentChanged(
  previousDoc: Record<string, unknown> | null | undefined,
  nextDoc: Record<string, unknown>,
  collection: string,
  fingerprintOf: SourceFingerprinter
): boolean {
  if (!previousDoc) return true;

  const before = fingerprintOf(collection, previousDoc);
  const after = fingerprintOf(collection, nextDoc);
  if (before === null || after === null) return true;

  return !sameFingerprints(before, after);
}
