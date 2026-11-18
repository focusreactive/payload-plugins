import type { YoastResearcher } from "../../researcherAdapter";
import type { CheckResult } from "../../types/analysis";
import type { PaperLike } from "../../types/paper";

import { extractCheckData } from "../../extractCheckData";
import { directionalRecommendation } from "../../recommendations";
import type { AnalysisThresholds } from "../../thresholds/analysisThresholds";
import { thresholdVars } from "../../thresholds/thresholdVars";
import { resolveVisualization } from "../../visualization/resolveVisualization";

export function enrich(
  checks: CheckResult[],
  paper: PaperLike,
  researcher: YoastResearcher,
  { values }: AnalysisThresholds
): CheckResult[] {
  return checks.map((check) => {
    const data = extractCheckData(check.id, paper, researcher, values);

    return {
      ...check,
      data,
      recommendation:
        directionalRecommendation(check.id, check.status, data, values) ?? check.recommendation,
      tipVars: thresholdVars(check.id, values),
      viz: resolveVisualization(check, data, values),
    };
  });
}
