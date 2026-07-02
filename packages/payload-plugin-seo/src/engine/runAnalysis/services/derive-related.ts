import RelatedKeywordAssessor from "yoastseo/build/scoring/assessors/relatedKeywordAssessor";
import { runAssessor } from "../../assessorAdapter";
import { makeResearcher } from "../../researcherAdapter";
import type { CategoryResult } from "../../types/analysis";
import type { PaperData, PaperLike } from "../../types/paper";
import { enrich } from "../utils/enrich";
import { toCategory } from "../utils/toCategory";

export function deriveRelatedKeyphrase(paper: PaperData, keyphrase: string): CategoryResult {
  const ctx = { keyphrase };
  const researcher = makeResearcher(paper);
  const assessor = new RelatedKeywordAssessor(makeResearcher(paper));
  const checks = enrich(runAssessor(assessor, ctx, paper), paper as PaperLike, researcher);

  return toCategory(checks);
}
