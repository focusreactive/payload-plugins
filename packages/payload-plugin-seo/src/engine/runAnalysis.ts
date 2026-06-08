import { SeoAssessor, ContentAssessor, assessors } from "yoastseo";
import KeyphraseDistributionAssessment from "yoastseo/build/scoring/assessments/seo/KeyphraseDistributionAssessment";
import { buildPaper } from "./buildPaper";
import { makeResearcher, getResearch } from "./researcherAdapter";
import { runAssessor } from "./assessorAdapter";
import { partitionSeo } from "./partitionSeo";
import { scoreToStatus, statusToRing, ringToStatus, fleschToStatus } from "./scoreStatus";
import { getRecommendation } from "./recommendations";
import type { RecoContext } from "./recommendations";
import { scoreInclusive } from "./inclusiveScore";
import type { RawInclusiveFlag } from "./inclusiveScore";
import { deriveVitals } from "./deriveVitals";
import { deriveSerp } from "./deriveSerp";
import type { AnalysisInput, AnalysisResult, CategoryResult, CheckResult } from "./types";
import { extractCheckData } from "./extractCheckData";
import type { PaperLike } from "./extractCheckData";
import type { YoastResearcher } from "./researcherAdapter";

const { InclusiveLanguageAssessor } = assessors;

const INCLUSIVE_CATEGORIES = ["Age", "Appearance & body", "Culture, race & religion", "Disability", "Gendered language", "Sexual orientation", "Socioeconomic status", "Other"];

function toCategory(checks: CheckResult[]): CategoryResult {
  const ringScore = statusToRing(checks);

  return { ringScore, status: ringToStatus(ringScore), checks };
}

function enrich(checks: CheckResult[], paper: PaperLike, researcher: YoastResearcher): CheckResult[] {
  return checks.map((c) => ({
    ...c,
    data: extractCheckData(c.id, paper, researcher),
  }));
}

function fleschCheck(researcher: YoastResearcher, ctx: RecoContext): CheckResult | undefined {
  const r = getResearch<{ score: number }>(researcher, "getFleschReadingScore");
  if (!r || r.score < 0) return undefined;

  const status = fleschToStatus(r.score);

  return {
    id: "fleschReadingEase",
    score: r.score,
    status,
    recommendation: getRecommendation("fleschReadingEase", status, ctx),
    data: undefined,
  };
}

function extractInclusiveFlags(_results: { getIdentifier?: () => string; text?: string }[]): RawInclusiveFlag[] {
  return _results.flatMap(() => []);
}

export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const paper = buildPaper(input);
  const ctx = { keyphrase: input.keyphrase };
  const researcher = makeResearcher(paper);

  const seoAssessor = new SeoAssessor(makeResearcher(paper));
  seoAssessor.addAssessment("keyphraseDistribution", new KeyphraseDistributionAssessment());
  const seoChecks = enrich(runAssessor(seoAssessor, ctx, paper), paper as PaperLike, researcher);
  const { keyphrase, onPage } = partitionSeo(seoChecks);

  const readRaw = runAssessor(new ContentAssessor(makeResearcher(paper)), ctx, paper);
  const flesch = fleschCheck(researcher, ctx);
  const readChecks = enrich(flesch ? [...readRaw, flesch] : readRaw, paper as PaperLike, researcher);

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
    vitals: deriveVitals(researcher, input.keyphrase),
    serp: deriveSerp(input),
  };
}
