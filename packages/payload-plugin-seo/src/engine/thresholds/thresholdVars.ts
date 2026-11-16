import type { MessageVars } from "../../translations/types";
import type { ResolvedSeoThresholds } from "../../types/config";

export function thresholdVars(
  checkId: string,
  thresholds: ResolvedSeoThresholds
): MessageVars | undefined {
  switch (checkId) {
    case "keyphraseLength":
      return thresholds.keyphraseLength;
    case "keyphraseDensity":
      return thresholds.keyphraseDensity;
    case "metaDescriptionLength":
      return thresholds.metaDescriptionLength;
    case "titleWidth":
      return thresholds.titleWidth;
    case "textLength":
      return thresholds.textLength;
    case "textSentenceLength":
      return thresholds.textSentenceLength;
    case "fleschReadingEase":
      return thresholds.fleschReadingEase;
    default:
      return undefined;
  }
}
