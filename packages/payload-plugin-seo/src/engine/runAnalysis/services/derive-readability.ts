import type { Paper } from "yoastseo";
import { ContentAssessor } from "yoastseo";
import { runAssessor } from "../../assessorAdapter";
import { getRecommendation } from "../../recommendations";
import type { RecoContext } from "../../recommendations";
import { getResearch, makeResearcher } from "../../researcherAdapter";
import type { AnalysisThresholds } from "../../thresholds/analysisThresholds";
import { configureReadabilityAssessor } from "../../thresholds/configureAssessors";
import type { YoastResearcher } from "../../researcherAdapter";
import { fleschToStatus } from "../../scoreStatus";
import type { CategoryResult, CheckResult } from "../../types/analysis";
import { enrich } from "../utils/enrich";
import { toCategory } from "../utils/toCategory";
import type { PaperLike } from "../../types/paper";

function fleschCheck(researcher: YoastResearcher, ctx: RecoContext): CheckResult | undefined {
  const r = getResearch<{ score: number }>(researcher, "getFleschReadingScore");
  if (!r || r.score < 0) return undefined;

  const status = fleschToStatus(r.score, ctx.thresholds.fleschReadingEase);

  return {
    id: "fleschReadingEase",
    score: r.score,
    status,
    recommendation: getRecommendation("fleschReadingEase", status, ctx),
    data: undefined,
  };
}

export function deriveReadability(
  paper: InstanceType<typeof Paper>,
  keyphrase: string,
  thresholds: AnalysisThresholds
): CategoryResult {
  const ctx = { keyphrase, thresholds: thresholds.values };
  const researcher = makeResearcher(paper);

  const assessor = new ContentAssessor(researcher);
  configureReadabilityAssessor(assessor, thresholds);
  const readRaw = runAssessor(assessor, ctx, paper);
  const flesch = fleschCheck(researcher, ctx);
  const readChecks = enrich(
    flesch ? [...readRaw, flesch] : readRaw,
    paper as PaperLike,
    researcher,
    thresholds
  );

  return toCategory(readChecks);
}
