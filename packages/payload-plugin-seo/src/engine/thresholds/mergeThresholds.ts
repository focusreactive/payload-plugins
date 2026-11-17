import { DEFAULT_SEO_THRESHOLDS } from "../../constants";
import type { ResolvedSeoThresholds, SeoThresholds } from "../../types/config";

export type ThresholdCheck = keyof ResolvedSeoThresholds;

export type ThresholdField<Check extends ThresholdCheck> = keyof ResolvedSeoThresholds[Check] &
  string;

type BandOrder = {
  [Check in ThresholdCheck]: readonly ThresholdField<Check>[];
};

type CheckMerge = <Check extends ThresholdCheck>(check: Check) => ResolvedSeoThresholds[Check];

export const ASCENDING_BANDS: BandOrder = {
  keyphraseLength: ["max", "acceptableMax"],
  keyphraseDensity: ["min", "max"],
  metaDescriptionLength: ["min", "max"],
  titleWidth: ["max"],
  textLength: ["acceptableMin", "min"],
  textSentenceLength: ["max", "acceptableMax"],
  fleschReadingEase: ["acceptableMin", "min"],
};

export interface UnorderedBands {
  lower: string;
  upper: string;
}

export function findUnorderedBands(
  order: readonly string[],
  bands: Readonly<Record<string, unknown>>
): UnorderedBands | undefined {
  for (const [index, upper] of order.entries()) {
    const lower = order[index - 1];
    if (lower !== undefined && Number(bands[lower]) >= Number(bands[upper])) {
      return { lower, upper };
    }
  }
  return undefined;
}

function eachCheck(merge: CheckMerge): ResolvedSeoThresholds {
  return {
    keyphraseLength: merge("keyphraseLength"),
    keyphraseDensity: merge("keyphraseDensity"),
    metaDescriptionLength: merge("metaDescriptionLength"),
    titleWidth: merge("titleWidth"),
    textLength: merge("textLength"),
    textSentenceLength: merge("textSentenceLength"),
    fleschReadingEase: merge("fleschReadingEase"),
  };
}

function layered<Check extends ThresholdCheck>(
  check: Check,
  under: SeoThresholds,
  over: SeoThresholds
): ResolvedSeoThresholds[Check] {
  return { ...DEFAULT_SEO_THRESHOLDS[check], ...under[check], ...over[check] };
}

export function mergeThresholds(
  under: SeoThresholds,
  over: SeoThresholds = {}
): ResolvedSeoThresholds {
  return eachCheck((check) => layered(check, under, over));
}

export function mergeOrderedThresholds(
  language: SeoThresholds,
  configured: SeoThresholds
): ResolvedSeoThresholds {
  return eachCheck((check) => {
    const merged = layered(check, language, configured);
    return findUnorderedBands(ASCENDING_BANDS[check], merged)
      ? layered(check, {}, configured)
      : merged;
  });
}
