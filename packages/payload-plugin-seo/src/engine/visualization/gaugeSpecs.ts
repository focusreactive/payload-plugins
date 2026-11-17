import {
  FLESCH_SCORE_MAX,
  MAX_PERCENT,
  YOAST_BAD_SCORE,
  YOAST_DENSITY_OVER_MAXIMUM_SCORE,
  YOAST_DENSITY_UNDER_MINIMUM_SCORE,
  YOAST_GOOD_SCORE,
  YOAST_OKAY_SCORE,
  YOAST_PASSIVE_VOICE_BANDS,
  YOAST_TRANSITION_WORDS_BANDS,
} from "../../constants";
import type { CheckId } from "../../constants/checkIds";
import type { ResolvedSeoThresholds } from "../../types/config";
import type { GaugeSpec } from "../types/visualization";

export const AXIS_HEADROOM = 1.25;

const DEFAULT_AXIS_MAX = {
  keyphraseLength: 12,
  keyphraseDensity: 5,
  metaDescriptionLength: 180,
  titleWidth: 700,
  textLength: 350,
  readabilityShare: 50,
} as const;

function axisMaxFor(defaultAxisMax: number, highestThreshold: number): number {
  return highestThreshold < defaultAxisMax
    ? defaultAxisMax
    : Math.ceil(highestThreshold * AXIS_HEADROOM);
}

function percentAxisMaxFor(defaultAxisMax: number, highestThreshold: number): number {
  return Math.min(MAX_PERCENT, axisMaxFor(defaultAxisMax, highestThreshold));
}

export function gaugeSpecsFor({
  keyphraseLength,
  keyphraseDensity,
  metaDescriptionLength,
  titleWidth,
  textLength,
  textSentenceLength,
  fleschReadingEase,
}: ResolvedSeoThresholds): Partial<Record<CheckId, GaugeSpec>> {
  return {
    keyphraseLength: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: axisMaxFor(DEFAULT_AXIS_MAX.keyphraseLength, keyphraseLength.acceptableMax),
      thresholds: [keyphraseLength.max, keyphraseLength.acceptableMax],
      scores: [YOAST_GOOD_SCORE, YOAST_OKAY_SCORE, YOAST_BAD_SCORE],
      unit: "words",
    },
    keyphraseDensity: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: percentAxisMaxFor(DEFAULT_AXIS_MAX.keyphraseDensity, keyphraseDensity.max),
      thresholds: [keyphraseDensity.min, keyphraseDensity.max],
      scores: [
        YOAST_DENSITY_UNDER_MINIMUM_SCORE,
        YOAST_GOOD_SCORE,
        YOAST_DENSITY_OVER_MAXIMUM_SCORE,
      ],
      unit: "percent",
    },
    metaDescriptionLength: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: axisMaxFor(DEFAULT_AXIS_MAX.metaDescriptionLength, metaDescriptionLength.max),
      thresholds: [metaDescriptionLength.min, metaDescriptionLength.max],
      scores: [YOAST_OKAY_SCORE, YOAST_GOOD_SCORE, YOAST_OKAY_SCORE],
      unit: "chars",
    },
    titleWidth: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: axisMaxFor(DEFAULT_AXIS_MAX.titleWidth, titleWidth.max),
      thresholds: [titleWidth.max],
      scores: [YOAST_GOOD_SCORE, YOAST_BAD_SCORE],
      unit: "px",
    },
    textLength: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: axisMaxFor(DEFAULT_AXIS_MAX.textLength, textLength.min),
      thresholds: [textLength.acceptableMin, textLength.min],
      scores: [YOAST_BAD_SCORE, YOAST_OKAY_SCORE, YOAST_GOOD_SCORE],
      unit: "words",
      openEnded: true,
    },
    fleschReadingEase: {
      statusSource: "direct",
      axisMin: 0,
      axisMax: FLESCH_SCORE_MAX,
      thresholds: [fleschReadingEase.acceptableMin, fleschReadingEase.min],
      statuses: ["bad", "warn", "good"],
      unit: "score",
    },
    textSentenceLength: {
      statusSource: "direct",
      axisMin: 0,
      axisMax: percentAxisMaxFor(
        DEFAULT_AXIS_MAX.readabilityShare,
        textSentenceLength.acceptableMax
      ),
      thresholds: [textSentenceLength.max, textSentenceLength.acceptableMax],
      statuses: ["good", "warn", "bad"],
      unit: "percent",
    },
    passiveVoice: {
      statusSource: "direct",
      axisMin: 0,
      axisMax: DEFAULT_AXIS_MAX.readabilityShare,
      thresholds: [...YOAST_PASSIVE_VOICE_BANDS],
      statuses: ["good", "warn", "bad"],
      unit: "percent",
    },
    textTransitionWords: {
      statusSource: "direct",
      axisMin: 0,
      axisMax: DEFAULT_AXIS_MAX.readabilityShare,
      thresholds: [...YOAST_TRANSITION_WORDS_BANDS],
      statuses: ["bad", "warn", "good"],
      unit: "percent",
      openEnded: true,
    },
  };
}
