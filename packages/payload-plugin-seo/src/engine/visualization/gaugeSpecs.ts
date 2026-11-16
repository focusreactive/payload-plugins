import { DEFAULT_SEO_THRESHOLDS, MAX_PERCENT, SHORT_TITLE_WIDTH_PX } from "../../constants";
import type { CheckId } from "../../constants/checkIds";
import type { ResolvedSeoThresholds } from "../../types/config";
import type { GaugeSpec } from "../types/visualization";

const AXIS_HEADROOM = 1.25;

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
      axisMax: axisMaxFor(12, keyphraseLength.acceptableMax),
      thresholds: [keyphraseLength.max, keyphraseLength.acceptableMax],
      scores: [9, 6, 3],
      unit: "words",
    },
    keyphraseDensity: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: percentAxisMaxFor(5, keyphraseDensity.max),
      thresholds: [keyphraseDensity.min, keyphraseDensity.max],
      scores: [4, 9, -10],
      unit: "percent",
    },
    metaDescriptionLength: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: axisMaxFor(180, metaDescriptionLength.max),
      thresholds: [0, metaDescriptionLength.min, metaDescriptionLength.max],
      scores: [3, 6, 9, 6],
      unit: "chars",
    },
    titleWidth: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: axisMaxFor(700, titleWidth.max),
      thresholds: [SHORT_TITLE_WIDTH_PX, titleWidth.max],
      scores: [6, 9, 3],
      unit: "px",
    },
    textLength: {
      statusSource: "yoast",
      axisMin: 0,
      axisMax: axisMaxFor(350, textLength.min),
      thresholds: [textLength.acceptableMin, textLength.min],
      scores: [3, 6, 9],
      unit: "words",
    },
    fleschReadingEase: {
      statusSource: "direct",
      axisMin: 0,
      axisMax: 100,
      thresholds: [fleschReadingEase.acceptableMin, fleschReadingEase.min],
      statuses: ["bad", "warn", "good"],
      unit: "score",
    },
    textSentenceLength: {
      statusSource: "direct",
      axisMin: 0,
      axisMax: percentAxisMaxFor(50, textSentenceLength.acceptableMax),
      thresholds: [textSentenceLength.max, textSentenceLength.acceptableMax],
      statuses: ["good", "warn", "bad"],
      unit: "percent",
    },
    passiveVoice: {
      statusSource: "direct",
      axisMin: 0,
      axisMax: 50,
      thresholds: [10, 15],
      statuses: ["good", "warn", "bad"],
      unit: "percent",
    },
    textTransitionWords: {
      statusSource: "direct",
      axisMin: 0,
      axisMax: 50,
      thresholds: [20, 30],
      statuses: ["bad", "warn", "good"],
      unit: "percent",
    },
  };
}

export const GAUGE_SPECS = gaugeSpecsFor(DEFAULT_SEO_THRESHOLDS);
