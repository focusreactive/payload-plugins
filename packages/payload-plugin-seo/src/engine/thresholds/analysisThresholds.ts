import type { ResolvedSeoThresholds, SeoThresholds } from "../../types/config";
import type { YoastResearcher } from "../researcherAdapter";
import { languageThresholds } from "./languageThresholds";
import { mergeOrderedThresholds } from "./mergeThresholds";

export interface AnalysisThresholds {
  values: ResolvedSeoThresholds;
  configured: SeoThresholds;
}

export function analysisThresholds(
  configured: SeoThresholds = {},
  researcher?: YoastResearcher
): AnalysisThresholds {
  const language = researcher ? languageThresholds(researcher) : {};

  return { values: mergeOrderedThresholds(language, configured), configured };
}
