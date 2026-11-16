import type { ResolvedSeoThresholds, SeoThresholds } from "../../types/config";
import { resolveThresholds } from "../../utils/config/resolveThresholds";

export interface AnalysisThresholds {
  values: ResolvedSeoThresholds;
  configured: SeoThresholds;
}

export function analysisThresholds(configured: SeoThresholds = {}): AnalysisThresholds {
  return { values: resolveThresholds(configured), configured };
}
