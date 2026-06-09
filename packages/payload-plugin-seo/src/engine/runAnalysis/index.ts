import { buildPaper } from "../buildPaper";
import type { AnalysisInput, AnalysisResult } from "../types/analysis";
import { deriveInclusive } from "./services/derive-inclusive";
import { deriveReadability } from "./services/derive-readability";
import { deriveSeo } from "./services/derive-seo";
import { deriveSerp } from "./services/derive-serp";
import { deriveVitals } from "./services/derive-vitals";

export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const paper = buildPaper(input);
  const { keyphrase } = input;

  const seo = deriveSeo(paper, keyphrase);

  return {
    overall: seo.overall,
    keyphrase: seo.keyphrase,
    onPage: seo.onPage,
    readability: deriveReadability(paper, keyphrase),
    inclusive: deriveInclusive(paper),
    vitals: deriveVitals(paper, keyphrase),
    serp: deriveSerp(input),
  };
}
