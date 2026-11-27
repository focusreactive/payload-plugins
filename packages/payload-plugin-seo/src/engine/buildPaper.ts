import { Paper } from "yoastseo";
import { getTitleProgressGuarded } from "./helpers/title-progress";
import { documentUrl } from "./runAnalysis/services/derive-serp";
import type { AnalysisInput, KeyphraseInput } from "./types/analysis";
import type { PaperData } from "./types/paper";

export function buildPaper(input: AnalysisInput, keyphrase?: KeyphraseInput): PaperData {
  const focus: KeyphraseInput = keyphrase ??
    input.keyphrases[0] ?? { text: input.keyphrase, synonyms: [] };

  return new Paper(input.contentHtml, {
    keyword: focus.text,
    synonyms: focus.synonyms.join(", "),
    title: input.title,
    titleWidth: getTitleProgressGuarded(input.title).actual,
    description: input.description,
    slug: input.slug,
    permalink: input.site.baseUrl ? documentUrl(input) : input.slug,
    locale: input.locale,
  });
}
