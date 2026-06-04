import { getRecommendation } from "./recommendations";
import type { RecoContext } from "./recommendations";
import { scoreToStatus } from "./scoreStatus";
import type { CheckResult } from "./types";

interface YoastAssessmentResult {
  getIdentifier?: () => string;
  _identifier?: string;
  score: number;
}
interface YoastAssessor {
  assess: (paper: unknown) => void;
  getValidResults: () => YoastAssessmentResult[];
}

function identifierOf(r: YoastAssessmentResult): string {
  return r.getIdentifier?.() ?? r._identifier ?? "unknown";
}

export function runAssessor(assessor: YoastAssessor, ctx: RecoContext, paper?: unknown): CheckResult[] {
  assessor.assess(paper);

  return assessor.getValidResults().map((r) => {
    const id = identifierOf(r);
    const status = scoreToStatus(r.score);

    return {
      id,
      score: r.score,
      status,
      recommendation: getRecommendation(id, status, ctx),
      data: undefined,
    };
  });
}
