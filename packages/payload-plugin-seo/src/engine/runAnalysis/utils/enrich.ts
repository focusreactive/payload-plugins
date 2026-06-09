import type { YoastResearcher } from "../../researcherAdapter";
import type { CheckResult } from "../../types/analysis";
import type { PaperLike } from "../../types/paper";

import { extractCheckData } from "../../extractCheckData";

export function enrich(checks: CheckResult[], paper: PaperLike, researcher: YoastResearcher): CheckResult[] {
  return checks.map((check) => ({
    ...check,
    data: extractCheckData(check.id, paper, researcher),
  }));
}
