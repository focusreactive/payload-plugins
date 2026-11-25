import type { FieldFingerprints } from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { ProvenanceReceipt } from "../../../core/domain/provenance/index.js";
import { leafVerdicts } from "../../../core/domain/provenance/index.js";
import type { ContentState } from "../../../types/wire/DocumentTranslationState.js";

export type LocaleContentQuestion = {
  holdsContent: boolean;
  keepsRecords: boolean;
  receipt: ProvenanceReceipt | undefined;
  /** The source document's per-leaf fingerprints as they stand now. */
  currentFields: FieldFingerprints;
};

/**
 * What one target locale holds. Emptiness is decided by the values and never by the presence of a
 * record: a locale someone cleared reads `empty` again, receipt or no receipt.
 */
export function localeContentOf(question: LocaleContentQuestion): ContentState {
  if (!question.holdsContent) return { kind: "empty" };
  if (!question.keepsRecords) return { kind: "filled" };

  const { receipt } = question;
  if (receipt === undefined) return { kind: "untracked" };

  return {
    kind: "tracked",
    verdicts: leafVerdicts(receipt.sourceFingerprint ?? {}, question.currentFields),
    translatedAt: receipt.translatedAt,
  };
}
