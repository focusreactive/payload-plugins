import { DENSITY_MIN_TEXT_WORDS, TRANSITION_WORDS_MIN_TEXT_WORDS } from "../../../constants";
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

export const minTextLengthByCheck: Partial<Record<CheckId, number>> = {
  keyphraseDensity: DENSITY_MIN_TEXT_WORDS,
  textTransitionWords: TRANSITION_WORDS_MIN_TEXT_WORDS,
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
