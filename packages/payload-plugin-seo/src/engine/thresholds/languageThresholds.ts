import japaneseMetaDescriptionLength from "yoastseo/build/languageProcessing/languages/ja/config/metaDescriptionLength";
import {
  YOAST_JAPANESE_LANGUAGE,
  YOAST_KEYPHRASE_LENGTH_WITHOUT_FUNCTION_WORDS,
} from "../../constants";
import type { SeoThresholds } from "../../types/config";
import { definedOnly } from "../../utils/definedOnly";
import { getResearcherConfig } from "../researcherAdapter";
import type { YoastResearcher } from "../researcherAdapter";

interface KeyphraseLengthConfig {
  defaultAnalysis?: { parameters?: { recommendedMaximum?: number; acceptableMaximum?: number } };
}

interface TextLengthConfig {
  defaultAnalysis?: { recommendedMinimum?: number; slightlyBelowMinimum?: number };
}

interface SentenceLengthConfig {
  recommendedLength?: number;
  percentages?: { slightlyTooMany?: number; farTooMany?: number };
}

interface MetaDescriptionLengthConfig {
  recommendedMaximumLength: number;
  maximumLength: number;
}

function keyphraseLengthOf(researcher: YoastResearcher): SeoThresholds["keyphraseLength"] {
  const custom = getResearcherConfig<KeyphraseLengthConfig | false>(researcher, "keyphraseLength");
  if (custom) {
    const parameters = custom.defaultAnalysis?.parameters;
    return definedOnly({
      max: parameters?.recommendedMaximum,
      acceptableMax: parameters?.acceptableMaximum,
    });
  }

  const functionWords = getResearcherConfig<unknown>(researcher, "functionWords");

  return Array.isArray(functionWords) && functionWords.length === 0
    ? YOAST_KEYPHRASE_LENGTH_WITHOUT_FUNCTION_WORDS
    : undefined;
}

function metaDescriptionLengthOf(
  researcher: YoastResearcher
): SeoThresholds["metaDescriptionLength"] {
  if (getResearcherConfig(researcher, "language") !== YOAST_JAPANESE_LANGUAGE) return undefined;

  const japanese: MetaDescriptionLengthConfig = japaneseMetaDescriptionLength;

  return { min: japanese.recommendedMaximumLength, max: japanese.maximumLength };
}

function textLengthOf(researcher: YoastResearcher): SeoThresholds["textLength"] {
  const bands = getResearcherConfig<TextLengthConfig | false>(researcher, "textLength");
  if (!bands) return undefined;

  return definedOnly({
    min: bands.defaultAnalysis?.recommendedMinimum,
    acceptableMin: bands.defaultAnalysis?.slightlyBelowMinimum,
  });
}

function textSentenceLengthOf(researcher: YoastResearcher): SeoThresholds["textSentenceLength"] {
  const bands = getResearcherConfig<SentenceLengthConfig | false>(researcher, "sentenceLength");
  if (!bands) return undefined;

  return definedOnly({
    maxSentenceWords: bands.recommendedLength,
    max: bands.percentages?.slightlyTooMany,
    acceptableMax: bands.percentages?.farTooMany,
  });
}

export function languageThresholds(researcher: YoastResearcher): SeoThresholds {
  return {
    keyphraseLength: keyphraseLengthOf(researcher),
    metaDescriptionLength: metaDescriptionLengthOf(researcher),
    textLength: textLengthOf(researcher),
    textSentenceLength: textSentenceLengthOf(researcher),
  };
}
