import type { YoastResearcher } from "../../researcherAdapter";
import type { CheckResult } from "../../types/analysis";
import type { PaperLike } from "../../types/paper";
import type { ResolvedSeoThresholds } from "../../../types/config";

import { extractCheckData } from "../../extractCheckData";
import { thresholdVars } from "../../thresholds/thresholdVars";
import { resolveVisualization } from "../../visualization/resolveVisualization";

export function enrich(
  checks: CheckResult[],
  paper: PaperLike,
  researcher: YoastResearcher,
  thresholds: ResolvedSeoThresholds
): CheckResult[] {
  return checks.map((check) => {
    const data = extractCheckData(check.id, paper, researcher, thresholds);

    return {
      ...check,
      data,
      tipVars: thresholdVars(check.id, thresholds),
      viz: resolveVisualization(check, data, thresholds),
    };
  });
}
