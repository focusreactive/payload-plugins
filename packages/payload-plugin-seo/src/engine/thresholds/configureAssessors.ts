import KeyphraseLengthAssessment from "yoastseo/build/scoring/assessments/seo/KeyphraseLengthAssessment";
import KeyphraseDensityAssessment from "yoastseo/build/scoring/assessments/seo/KeywordDensityAssessment";
import MetaDescriptionLengthAssessment from "yoastseo/build/scoring/assessments/seo/MetaDescriptionLengthAssessment";
import PageTitleWidthAssessment from "yoastseo/build/scoring/assessments/seo/PageTitleWidthAssessment";
import TextLengthAssessment from "yoastseo/build/scoring/assessments/seo/TextLengthAssessment";
import SentenceLengthInTextAssessment from "yoastseo/build/scoring/assessments/readability/SentenceLengthInTextAssessment";
import { DEFAULT_SEO_THRESHOLDS } from "../../constants";
import type { ResolvedSeoThresholds } from "../../types/config";

interface ConfigurableAssessor {
  addAssessment: (identifier: string, assessment: unknown) => boolean;
}

type ThresholdCheck = keyof ResolvedSeoThresholds;

const YOAST_DENSITY_OVER_MAXIMUM = 4;
const YOAST_TEXT_LENGTH_BELOW_MINIMUM = 200;
const YOAST_TEXT_LENGTH_VERY_FAR_BELOW_MINIMUM = 100;
const SEO_ASSESSOR_SHORT_TITLE_SCORE = 9;

function isConfigured(check: ThresholdCheck, thresholds: ResolvedSeoThresholds): boolean {
  const defaults: Readonly<Record<string, number>> = DEFAULT_SEO_THRESHOLDS[check];
  const configured: Readonly<Record<string, number>> = thresholds[check];

  return Object.keys(defaults).some((field) => defaults[field] !== configured[field]);
}

function keyphraseLengthAssessment(
  { keyphraseLength }: ResolvedSeoThresholds,
  isRelatedKeyphrase: boolean
): unknown {
  const bounds = {
    recommendedMaximum: keyphraseLength.max,
    acceptableMaximum: keyphraseLength.acceptableMax,
  };

  return new KeyphraseLengthAssessment({
    parameters: bounds,
    parametersNoFunctionWordSupport: bounds,
    isRelatedKeyphrase,
  });
}

function keyphraseDensityAssessment({ keyphraseDensity }: ResolvedSeoThresholds): unknown {
  const bounds = {
    minimum: keyphraseDensity.min,
    maximum: keyphraseDensity.max,
    overMaximum: Math.max(YOAST_DENSITY_OVER_MAXIMUM, keyphraseDensity.max),
  };

  return new KeyphraseDensityAssessment({
    parameters: { noWordForms: bounds, multipleWordForms: bounds },
  });
}

function metaDescriptionLengthAssessment({
  metaDescriptionLength,
}: ResolvedSeoThresholds): unknown {
  return new MetaDescriptionLengthAssessment({
    recommendedMaximumLength: metaDescriptionLength.min,
    maximumLength: metaDescriptionLength.max,
  });
}

function titleWidthAssessment({ titleWidth }: ResolvedSeoThresholds): unknown {
  return new PageTitleWidthAssessment(
    { maxLength: titleWidth.max, scores: { widthTooShort: SEO_ASSESSOR_SHORT_TITLE_SCORE } },
    true
  );
}

function textLengthAssessment({ textLength }: ResolvedSeoThresholds): unknown {
  const belowMinimum = Math.min(YOAST_TEXT_LENGTH_BELOW_MINIMUM, textLength.acceptableMin);

  return new TextLengthAssessment({
    recommendedMinimum: textLength.min,
    slightlyBelowMinimum: textLength.acceptableMin,
    belowMinimum,
    veryFarBelowMinimum: Math.min(YOAST_TEXT_LENGTH_VERY_FAR_BELOW_MINIMUM, belowMinimum),
  });
}

function sentenceLengthAssessment({ textSentenceLength }: ResolvedSeoThresholds): unknown {
  return new SentenceLengthInTextAssessment({
    recommendedLength: textSentenceLength.maxSentenceWords,
    slightlyTooMany: textSentenceLength.max,
    farTooMany: textSentenceLength.acceptableMax,
  });
}

type AssessmentFactory = readonly [ThresholdCheck, (thresholds: ResolvedSeoThresholds) => unknown];

function replaceConfigured(
  assessor: ConfigurableAssessor,
  thresholds: ResolvedSeoThresholds,
  factories: readonly AssessmentFactory[]
): void {
  for (const [check, create] of factories) {
    if (isConfigured(check, thresholds)) assessor.addAssessment(check, create(thresholds));
  }
}

export function configureSeoAssessor(
  assessor: ConfigurableAssessor,
  thresholds: ResolvedSeoThresholds
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
  thresholds: ResolvedSeoThresholds
): void {
  replaceConfigured(assessor, thresholds, [
    ["keyphraseLength", (configured) => keyphraseLengthAssessment(configured, true)],
    ["keyphraseDensity", keyphraseDensityAssessment],
  ]);
}

export function configureReadabilityAssessor(
  assessor: ConfigurableAssessor,
  thresholds: ResolvedSeoThresholds
): void {
  replaceConfigured(assessor, thresholds, [["textSentenceLength", sentenceLengthAssessment]]);
}
