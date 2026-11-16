import relatedKeywordAssessorModule from "yoastseo/build/scoring/assessors/relatedKeywordAssessor";
import { runAssessor } from "../../assessorAdapter";
import { commonJsDefault } from "../../helpers/commonjs-default";
import { makeResearcher } from "../../researcherAdapter";
import type { AnalysisThresholds } from "../../thresholds/analysisThresholds";
import { configureRelatedKeyphraseAssessor } from "../../thresholds/configureAssessors";
import type { CategoryResult } from "../../types/analysis";
import type { PaperData, PaperLike } from "../../types/paper";
import { enrich } from "../utils/enrich";
import { toCategory } from "../utils/toCategory";

const RelatedKeywordAssessor = commonJsDefault(relatedKeywordAssessorModule);

export function deriveRelatedKeyphrase(
  paper: PaperData,
  keyphrase: string,
  thresholds: AnalysisThresholds
): CategoryResult {
  const ctx = { keyphrase, thresholds: thresholds.values };
  const researcher = makeResearcher(paper);
  const assessor = new RelatedKeywordAssessor(makeResearcher(paper));
  configureRelatedKeyphraseAssessor(assessor, thresholds);
  const checks = enrich(
    runAssessor(assessor, ctx, paper),
    paper as PaperLike,
    researcher,
    thresholds
  );

  return toCategory(checks);
}
