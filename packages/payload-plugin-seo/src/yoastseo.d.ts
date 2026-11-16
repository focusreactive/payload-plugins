declare module "yoastseo";
declare module "yoastseo/build/languageProcessing/languages/en/Researcher";
declare module "yoastseo/build/scoring/assessments/seo/KeyphraseDistributionAssessment";
declare module "yoastseo/build/scoring/assessments/seo/KeyphraseLengthAssessment";
declare module "yoastseo/build/scoring/assessments/seo/KeywordDensityAssessment";
declare module "yoastseo/build/scoring/assessments/seo/MetaDescriptionLengthAssessment";
declare module "yoastseo/build/scoring/assessments/seo/PageTitleWidthAssessment";
declare module "yoastseo/build/scoring/assessments/seo/TextLengthAssessment";
declare module "yoastseo/build/scoring/assessments/readability/SentenceLengthInTextAssessment";
declare module "yoastseo/build/scoring/assessors/relatedKeywordAssessor";
declare module "yoastseo/build/scoring/helpers/assessments/keyphraseLengthFactor";
declare module "yoastseo/build/helpers/formatNumber";
declare module "yoastseo/build/languageProcessing/languages/ja/config/metaDescriptionLength";
declare module "@yoast/search-metadata-previews/build/helpers/progress" {
  export interface LengthProgress {
    actual: number;
    max: number;
    score: number;
  }

  export function getTitleProgress(title: string): LengthProgress;
}
