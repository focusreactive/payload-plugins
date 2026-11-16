import type { ResolvedSeoThresholds } from "../types/config";

export const DEFAULT_SEO_THRESHOLDS: ResolvedSeoThresholds = {
  keyphraseLength: { max: 4, acceptableMax: 8 },
  keyphraseDensity: { min: 0.5, max: 3 },
  metaDescriptionLength: { min: 120, max: 156 },
  titleWidth: { max: 600 },
  textLength: { min: 300, acceptableMin: 250 },
  textSentenceLength: { maxSentenceWords: 20, max: 25, acceptableMax: 30 },
  fleschReadingEase: { min: 60, acceptableMin: 50 },
};

export const SHORT_TITLE_WIDTH_PX = 400;
export const DENSITY_MIN_TEXT_WORDS = 100;
export const MAX_PERCENT = 100;
