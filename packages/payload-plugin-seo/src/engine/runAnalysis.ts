import { SeoAssessor, ContentAssessor, assessors } from "yoastseo";
import { buildPaper } from "./buildPaper";
import { makeResearcher } from "./researcherAdapter";
import { runAssessor } from "./assessorAdapter";
import { partitionSeo } from "./partitionSeo";
import { scoreToStatus, statusToRing, ringToStatus } from "./scoreStatus";
import { scoreInclusive } from "./inclusiveScore";
import type { RawInclusiveFlag } from "./inclusiveScore";
import { deriveVitals } from "./deriveVitals";
import { deriveSerp } from "./deriveSerp";
import type { AnalysisInput, AnalysisResult, CategoryResult, CheckResult } from "./types";

const { InclusiveLanguageAssessor } = assessors;

const INCLUSIVE_CATEGORIES = ["Age", "Appearance & body", "Culture, race & religion", "Disability", "Gendered language", "Sexual orientation", "Socioeconomic status", "Other"];

function toCategory(checks: CheckResult[]): CategoryResult {
  const ringScore = statusToRing(checks);

  return { ringScore, status: ringToStatus(ringScore), checks };
}

function extractInclusiveFlags(_results: { getIdentifier?: () => string; text?: string }[]): RawInclusiveFlag[] {
  return _results.flatMap(() => []);
}

export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const paper = buildPaper(input);
  const ctx = { keyphrase: input.keyphrase };

  const seoChecks = runAssessor(new SeoAssessor(makeResearcher(paper)), ctx, paper);
  const { keyphrase, onPage } = partitionSeo(seoChecks);

  const readChecks = runAssessor(new ContentAssessor(makeResearcher(paper)), ctx, paper);

  const inclusiveAssessor = new InclusiveLanguageAssessor(makeResearcher(paper));
  inclusiveAssessor.assess(paper);
  const inclusive = scoreInclusive(extractInclusiveFlags(inclusiveAssessor.getValidResults()), INCLUSIVE_CATEGORIES);

  const seoScore = statusToRing(seoChecks);

  return {
    overall: { seoScore, status: scoreToStatus(seoScore / 10) },
    keyphrase: toCategory(keyphrase),
    onPage: toCategory(onPage),
    readability: toCategory(readChecks),
    inclusive,
    vitals: deriveVitals(makeResearcher(paper), input.keyphrase),
    serp: deriveSerp(input),
  };
}
