import keyphraseLengthAssessmentModule from "yoastseo/build/scoring/assessments/seo/KeyphraseLengthAssessment";
import keyphraseDensityAssessmentModule from "yoastseo/build/scoring/assessments/seo/KeywordDensityAssessment";
import metaDescriptionLengthAssessmentModule from "yoastseo/build/scoring/assessments/seo/MetaDescriptionLengthAssessment";
import pageTitleWidthAssessmentModule from "yoastseo/build/scoring/assessments/seo/PageTitleWidthAssessment";
import textLengthAssessmentModule from "yoastseo/build/scoring/assessments/seo/TextLengthAssessment";
import sentenceLengthInTextAssessmentModule from "yoastseo/build/scoring/assessments/readability/SentenceLengthInTextAssessment";
import {
  DEFAULT_SEO_THRESHOLDS,
  YOAST_DENSITY_OVER_MAXIMUM,
  YOAST_GOOD_SCORE,
  YOAST_TEXT_LENGTH_BELOW_MINIMUM,
  YOAST_TEXT_LENGTH_VERY_FAR_BELOW_MINIMUM,
} from "../../constants";
import { commonJsDefault } from "../helpers/commonjs-default";
import type { SeoThresholds } from "../../types/config";
import { definedOnly } from "../../utils/definedOnly";
import type { AnalysisThresholds } from "./analysisThresholds";
import { adjustLanguageConfig, applyOverrides } from "./yoastConfig";
import type { YoastConfig } from "./yoastConfig";

const KeyphraseLengthAssessment = commonJsDefault(keyphraseLengthAssessmentModule);
const KeyphraseDensityAssessment = commonJsDefault(keyphraseDensityAssessmentModule);
const MetaDescriptionLengthAssessment = commonJsDefault(metaDescriptionLengthAssessmentModule);
const PageTitleWidthAssessment = commonJsDefault(pageTitleWidthAssessmentModule);
const TextLengthAssessment = commonJsDefault(textLengthAssessmentModule);
const SentenceLengthInTextAssessment = commonJsDefault(sentenceLengthInTextAssessmentModule);

const SEO_ASSESSOR_SHORT_TITLE_SCORE = YOAST_GOOD_SCORE;

const DENSITY_OVER_MAXIMUM_MARGIN =
  YOAST_DENSITY_OVER_MAXIMUM - DEFAULT_SEO_THRESHOLDS.keyphraseDensity.max;

interface ConfigurableAssessor {
  addAssessment: (identifier: string, assessment: unknown) => boolean;
}

function reapplying(overrides: YoastConfig) {
  return (languageConfig: YoastConfig) => applyOverrides(languageConfig, overrides);
}

function keyphraseLengthAssessment(
  { keyphraseLength }: SeoThresholds,
  isRelatedKeyphrase: boolean
): unknown {
  const parameters = definedOnly({
    recommendedMaximum: keyphraseLength?.max,
    acceptableMaximum: keyphraseLength?.acceptableMax,
  });
  const assessment = new KeyphraseLengthAssessment({
    parameters,
    parametersNoFunctionWordSupport: parameters,
    isRelatedKeyphrase,
  });

  return adjustLanguageConfig(assessment, "getCustomConfig", reapplying({ parameters }));
}

function keyphraseDensityAssessment({ keyphraseDensity }: SeoThresholds): unknown {
  const max = keyphraseDensity?.max;
  const bounds = definedOnly({
    minimum: keyphraseDensity?.min,
    maximum: max,
    overMaximum: max === undefined ? undefined : max + DENSITY_OVER_MAXIMUM_MARGIN,
  });

  return new KeyphraseDensityAssessment({
    parameters: { noWordForms: bounds, multipleWordForms: bounds },
  });
}

function metaDescriptionLengthAssessment({ metaDescriptionLength }: SeoThresholds): unknown {
  const tooShortUpTo = metaDescriptionLength?.min;
  const longestGood = metaDescriptionLength?.max;
  const lengths = definedOnly({
    recommendedMaximumLength: tooShortUpTo,
    maximumLength: longestGood,
  });

  return adjustLanguageConfig(
    new MetaDescriptionLengthAssessment(lengths),
    "getConfig",
    reapplying(lengths)
  );
}

function titleWidthAssessment({ titleWidth }: SeoThresholds): unknown {
  return new PageTitleWidthAssessment(
    {
      ...definedOnly({ maxLength: titleWidth?.max }),
      scores: { widthTooShort: SEO_ASSESSOR_SHORT_TITLE_SCORE },
    },
    true
  );
}

function belowBandsUnderAcceptable(config: YoastConfig): YoastConfig {
  const belowMinimum = Math.min(Number(config.belowMinimum), Number(config.slightlyBelowMinimum));

  return {
    ...config,
    belowMinimum,
    veryFarBelowMinimum: Math.min(Number(config.veryFarBelowMinimum), belowMinimum),
  };
}

function textLengthAssessment({ textLength }: SeoThresholds): unknown {
  const bands = definedOnly({
    recommendedMinimum: textLength?.min,
    slightlyBelowMinimum: textLength?.acceptableMin,
  });
  const initialBands =
    bands.slightlyBelowMinimum === undefined
      ? bands
      : belowBandsUnderAcceptable({
          belowMinimum: YOAST_TEXT_LENGTH_BELOW_MINIMUM,
          veryFarBelowMinimum: YOAST_TEXT_LENGTH_VERY_FAR_BELOW_MINIMUM,
          ...bands,
        });

  return adjustLanguageConfig(
    new TextLengthAssessment(initialBands),
    "getLanguageSpecificConfig",
    (languageConfig) => belowBandsUnderAcceptable(applyOverrides(languageConfig, bands))
  );
}

function sentenceLengthAssessment({ textSentenceLength }: SeoThresholds): unknown {
  const bands = definedOnly({
    recommendedLength: textSentenceLength?.maxSentenceWords,
    slightlyTooMany: textSentenceLength?.max,
    farTooMany: textSentenceLength?.acceptableMax,
  });

  return adjustLanguageConfig(
    new SentenceLengthInTextAssessment(bands),
    "getLanguageSpecificConfig",
    reapplying(bands)
  );
}

type AssessmentFactory = readonly [keyof SeoThresholds, (configured: SeoThresholds) => unknown];

function isConfigured(bands: Record<string, number | undefined> | undefined): boolean {
  return Object.values(bands ?? {}).some((value) => value !== undefined);
}

function replaceConfigured(
  assessor: ConfigurableAssessor,
  { configured }: AnalysisThresholds,
  factories: readonly AssessmentFactory[]
): void {
  for (const [check, create] of factories) {
    if (isConfigured(configured[check])) assessor.addAssessment(check, create(configured));
  }
}

export function configureSeoAssessor(
  assessor: ConfigurableAssessor,
  thresholds: AnalysisThresholds
): void {
  replaceConfigured(assessor, thresholds, [
    ["keyphraseLength", (configured) => keyphraseLengthAssessment(configured, false)],
    ["keyphraseDensity", keyphraseDensityAssessment],
    ["metaDescriptionLength", metaDescriptionLengthAssessment],
    ["titleWidth", titleWidthAssessment],
    ["textLength", textLengthAssessment],
  ]);
}

export function configureRelatedKeyphraseAssessor(
  assessor: ConfigurableAssessor,
  thresholds: AnalysisThresholds
): void {
  replaceConfigured(assessor, thresholds, [
    ["keyphraseLength", (configured) => keyphraseLengthAssessment(configured, true)],
    ["keyphraseDensity", keyphraseDensityAssessment],
  ]);
}

export function configureReadabilityAssessor(
  assessor: ConfigurableAssessor,
  thresholds: AnalysisThresholds
): void {
  replaceConfigured(assessor, thresholds, [["textSentenceLength", sentenceLengthAssessment]]);
}
