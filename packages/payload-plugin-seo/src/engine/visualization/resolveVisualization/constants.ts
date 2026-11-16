import type { CheckId } from "../../../constants/checkIds";

export const gaugeKeyByCheck: Partial<Record<CheckId, string>> = {
  keyphraseLength: "words",
  keyphraseDensity: "densityPct",
  metaDescriptionLength: "chars",
  titleWidth: "px",
  textLength: "words",
  textSentenceLength: "pct",
  textTransitionWords: "pct",
  passiveVoice: "pct",
  fleschReadingEase: "score",
};

export const PRESENCE_CHECKS = new Set<CheckId>([
  "introductionKeyword",
  "metaDescriptionKeyword",
  "keyphraseInSEOTitle",
  "slugKeyword",
  "functionWordsInKeyphrase",
  "images",
  "singleH1",
]);
