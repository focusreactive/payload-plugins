import type { YoastResearcher } from "../../researcherAdapter";
import type { CheckResult } from "../../types/analysis";
import type { PaperLike } from "../../types/paper";

import { extractCheckData } from "../../extractCheckData";
import { resolveVisualization } from "../../visualization/resolveVisualization";

export function enrich(checks: CheckResult[], paper: PaperLike, researcher: YoastResearcher): CheckResult[] {
  return checks.map((check) => {
    const data = extractCheckData(check.id, paper, researcher);

    return {
      ...check,
      data,
      viz: resolveVisualization(check, data),
    };
  });
}
