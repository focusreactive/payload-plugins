declare module "yoastseo";
declare module "yoastseo/build/languageProcessing/languages/en/Researcher";
declare module "yoastseo/build/scoring/assessments/seo/KeyphraseDistributionAssessment";
declare module "yoastseo/build/scoring/assessors/relatedKeywordAssessor";
declare module "@yoast/search-metadata-previews/build/helpers/progress" {
  export interface LengthProgress {
    actual: number;
    max: number;
    score: number;
  }

  export function getTitleProgress(title: string): LengthProgress;
}
