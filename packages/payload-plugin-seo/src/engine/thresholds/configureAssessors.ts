import KeyphraseDensityAssessment from "yoastseo/build/scoring/assessments/seo/KeywordDensityAssessment";
import PageTitleWidthAssessment from "yoastseo/build/scoring/assessments/seo/PageTitleWidthAssessment";
import type { SeoThresholds } from "../../types/config";
import { ConfiguredKeyphraseLengthAssessment } from "./assessments/ConfiguredKeyphraseLengthAssessment";
import { ConfiguredMetaDescriptionLengthAssessment } from "./assessments/ConfiguredMetaDescriptionLengthAssessment";
import { ConfiguredSentenceLengthAssessment } from "./assessments/ConfiguredSentenceLengthAssessment";
import { ConfiguredTextLengthAssessment } from "./assessments/ConfiguredTextLengthAssessment";

interface ConfigurableAssessor {
  addAssessment: (identifier: string, assessment: unknown) => boolean;
}

const YOAST_DENSITY_OVER_MAXIMUM = 4;
const SEO_ASSESSOR_SHORT_TITLE_SCORE = 9;

function definedOnly(values: Record<string, number | undefined>): Record<string, number> {
  const defined: Record<string, number> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) defined[key] = value;
  }

  return defined;
}

function keyphraseLengthAssessment(
  { keyphraseLength }: SeoThresholds,
  isRelatedKeyphrase: boolean
): unknown {
  return new ConfiguredKeyphraseLengthAssessment(
    definedOnly({
      recommendedMaximum: keyphraseLength?.max,
      acceptableMaximum: keyphraseLength?.acceptableMax,
    }),
    isRelatedKeyphrase
  );
}

function keyphraseDensityAssessment({ keyphraseDensity }: SeoThresholds): unknown {
  const max = keyphraseDensity?.max;
  const bounds = definedOnly({
    minimum: keyphraseDensity?.min,
    maximum: max,
    overMaximum: max === undefined ? undefined : Math.max(YOAST_DENSITY_OVER_MAXIMUM, max),
  });

  return new KeyphraseDensityAssessment({
    parameters: { noWordForms: bounds, multipleWordForms: bounds },
  });
}

function metaDescriptionLengthAssessment({ metaDescriptionLength }: SeoThresholds): unknown {
  return new ConfiguredMetaDescriptionLengthAssessment(
    definedOnly({
      recommendedMaximumLength: metaDescriptionLength?.min,
      maximumLength: metaDescriptionLength?.max,
    })
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

function textLengthAssessment({ textLength }: SeoThresholds): unknown {
  return new ConfiguredTextLengthAssessment(
    definedOnly({
      recommendedMinimum: textLength?.min,
      slightlyBelowMinimum: textLength?.acceptableMin,
    })
  );
}

function sentenceLengthAssessment({ textSentenceLength }: SeoThresholds): unknown {
  return new ConfiguredSentenceLengthAssessment(
    definedOnly({
      recommendedLength: textSentenceLength?.maxSentenceWords,
      slightlyTooMany: textSentenceLength?.max,
      farTooMany: textSentenceLength?.acceptableMax,
    })
  );
}

type AssessmentFactory = readonly [keyof SeoThresholds, (configured: SeoThresholds) => unknown];

function isConfigured(bands: Record<string, number | undefined> | undefined): boolean {
  return Object.values(bands ?? {}).some((value) => value !== undefined);
}

function replaceConfigured(
  assessor: ConfigurableAssessor,
  configured: SeoThresholds,
  factories: readonly AssessmentFactory[]
): void {
  for (const [check, create] of factories) {
    if (isConfigured(configured[check])) assessor.addAssessment(check, create(configured));
  }
}

export function configureSeoAssessor(
  assessor: ConfigurableAssessor,
  configured: SeoThresholds
): void {
  replaceConfigured(assessor, configured, [
    ["keyphraseLength", (thresholds) => keyphraseLengthAssessment(thresholds, false)],
    ["keyphraseDensity", keyphraseDensityAssessment],
    ["metaDescriptionLength", metaDescriptionLengthAssessment],
    ["titleWidth", titleWidthAssessment],
    ["textLength", textLengthAssessment],
  ]);
}

export function configureRelatedKeyphraseAssessor(
  assessor: ConfigurableAssessor,
  configured: SeoThresholds
): void {
  replaceConfigured(assessor, configured, [
    ["keyphraseLength", (thresholds) => keyphraseLengthAssessment(thresholds, true)],
    ["keyphraseDensity", keyphraseDensityAssessment],
  ]);
}

export function configureReadabilityAssessor(
  assessor: ConfigurableAssessor,
  configured: SeoThresholds
): void {
  replaceConfigured(assessor, configured, [["textSentenceLength", sentenceLengthAssessment]]);
}
