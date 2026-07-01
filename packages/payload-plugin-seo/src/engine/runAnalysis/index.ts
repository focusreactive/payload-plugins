import { buildPaper } from "../buildPaper";
import type { AnalysisInput, AnalysisResult, RelatedKeyphraseResult } from "../types/analysis";
import { deriveInclusive } from "./services/derive-inclusive";
import { deriveReadability } from "./services/derive-readability";
import { deriveRelatedKeyphrase } from "./services/derive-related";
import { deriveSeo } from "./services/derive-seo";
import { deriveSerp } from "./services/derive-serp";
import { deriveVitals } from "./services/derive-vitals";

export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const paper = buildPaper(input);
  const { keyphrase } = input;

  const seo = deriveSeo(paper, keyphrase);

  const relatedKeyphrases: RelatedKeyphraseResult[] = input.keyphrases
    .slice(1)
    .filter((kp) => kp.text.trim().length > 0)
    .map((kp) => ({
      text: kp.text,
      result: deriveRelatedKeyphrase(buildPaper(input, kp), kp.text),
    }));

  return {
    overall: seo.overall,
    keyphraseText: keyphrase,
    keyphrase: seo.keyphrase,
    relatedKeyphrases,
    onPage: seo.onPage,
    readability: deriveReadability(paper, keyphrase),
    inclusive: deriveInclusive(paper),
    vitals: deriveVitals(paper, keyphrase),
    serp: deriveSerp(input),
  };
}
