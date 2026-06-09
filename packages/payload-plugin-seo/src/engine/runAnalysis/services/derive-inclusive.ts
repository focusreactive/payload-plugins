import type { Paper } from "yoastseo";
import { assessors } from "yoastseo";
import { scoreInclusive } from '../../inclusiveScore';
import type { InclusiveResult, RawInclusiveFlag } from '../../inclusiveScore';
import { makeResearcher } from "../../researcherAdapter";

const { InclusiveLanguageAssessor } = assessors;

const INCLUSIVE_CATEGORIES = ["Age", "Appearance & body", "Culture, race & religion", "Disability", "Gendered language", "Sexual orientation", "Socioeconomic status", "Other"];

export function deriveInclusive(paper: InstanceType<typeof Paper>): InclusiveResult {
  const inclusiveAssessor = new InclusiveLanguageAssessor(makeResearcher(paper));
  inclusiveAssessor.assess(paper);

  return scoreInclusive(extractInclusiveFlags(inclusiveAssessor.getValidResults()), INCLUSIVE_CATEGORIES);
}

function extractInclusiveFlags(_results: { getIdentifier?: () => string; text?: string }[]): RawInclusiveFlag[] {
  return _results.flatMap(() => []);
}
