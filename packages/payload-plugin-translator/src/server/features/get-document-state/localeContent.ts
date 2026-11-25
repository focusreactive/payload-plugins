import type { FieldFingerprints } from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { ProvenanceReceipt } from "../../../core/domain/provenance/index.js";
import { leafVerdicts } from "../../../core/domain/provenance/index.js";
import type { ContentState, LeafVerdict } from "../../../types/wire/DocumentTranslationState.js";
import type { LeafAddress, LocaleCode } from "../../../types/wire/primitives.js";

export type SourcesAsTheyStand = ReadonlyMap<LocaleCode, FieldFingerprints | null>;

export type LocaleContentQuestion = {
  holdsContent: boolean;
  keepsRecords: boolean;
  receipt: ProvenanceReceipt | undefined;
  sources: SourcesAsTheyStand;
};

const everyCoveredLeafUnanswered = (receipt: ProvenanceReceipt) =>
  Object.fromEntries(
    Object.keys(receipt.sourceFingerprint ?? {}).map((address): [LeafAddress, LeafVerdict] => [
      address,
      "unanswered",
    ])
  );

/**
 * What one target locale holds. Emptiness is decided by the values and never by the presence of a
 * record: a locale someone cleared reads `empty` again, receipt or no receipt.
 */
export function localeContentOf(question: LocaleContentQuestion): ContentState {
  if (!question.holdsContent) return { kind: "empty" };
  if (!question.keepsRecords) return { kind: "filled" };

  const { receipt } = question;
  if (receipt === undefined) return { kind: "untracked" };

  const sourceNow = question.sources.get(receipt.sourceLocale) ?? null;
  return {
    kind: "tracked",
    verdicts:
      sourceNow === null
        ? everyCoveredLeafUnanswered(receipt)
        : leafVerdicts(receipt.sourceFingerprint ?? {}, sourceNow),
    translatedAt: receipt.translatedAt,
    sourceLocale: receipt.sourceLocale,
  };
}
