import relatedKeywordAssessorModule from "yoastseo/build/scoring/assessors/relatedKeywordAssessor";
import { runAssessor } from "../../assessorAdapter";
import { commonJsDefault } from "../../helpers/commonjs-default";
import { makeResearcher } from "../../researcherAdapter";
import { configureRelatedKeyphraseAssessor } from "../../thresholds/configureAssessors";
import type { CategoryResult } from "../../types/analysis";
import type { PaperData, PaperLike } from "../../types/paper";
import type { ResolvedSeoThresholds } from "../../../types/config";
import { enrich } from "../utils/enrich";
import { toCategory } from "../utils/toCategory";

const RelatedKeywordAssessor = commonJsDefault(relatedKeywordAssessorModule);

export function deriveRelatedKeyphrase(
  paper: PaperData,
  keyphrase: string,
  thresholds: ResolvedSeoThresholds
): CategoryResult {
  const ctx = { keyphrase, thresholds };
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
