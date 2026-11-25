import type {
  FieldFingerprints,
  SourceHash,
} from "../content-projection/computeFieldFingerprints.js";
import type { LeafAddress } from "../content-projection/idPath.js";

import type { RecordedClaim, RecordedFingerprints } from "./SourceFingerprint.js";
import { UNANSWERED } from "./SourceFingerprint.js";

/**
 * How one leaf of a translated locale stands against its source. `types/wire/DocumentTranslationState.ts`
 * spells the same four words for the admin, pinned by `__tests__/theVerdictVocabularyIsOne.pins.ts`.
 */
export type LeafVerdict = "current" | "drifted" | "unanswered" | "unrecorded";

/**
 * One entry per translatable leaf the source has now.
 */
export type LeafVerdicts = Readonly<Record<LeafAddress, LeafVerdict>>;

export const isOwed = (verdict: LeafVerdict): boolean => verdict !== "current";

function verdictOf(claim: RecordedClaim | undefined, current: SourceHash): LeafVerdict {
  if (claim === undefined) return "unrecorded";
  if (claim === UNANSWERED) return "unanswered";
  return claim === current ? "current" : "drifted";
}

/**
 * An absent claim means the last run recorded nothing for the leaf — it is new, or was empty then —
 * never that it is unchanged.
 */
export function leafVerdicts(
  recorded: RecordedFingerprints,
  currentFields: FieldFingerprints
): LeafVerdicts {
  const answers: Record<string, LeafVerdict> = {};
  for (const [address, current] of Object.entries(currentFields)) {
    answers[address] = verdictOf(recorded[address], current);
  }
  return answers;
}
