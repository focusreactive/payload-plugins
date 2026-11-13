import { Paper } from "yoastseo";
import type { AnalysisInput, KeyphraseInput } from "./types/analysis";
import type { PaperData } from "./types/paper";
import { getTitleProgressGuarded } from "./helpers/title-progress";

export function buildPaper(input: AnalysisInput, keyphrase?: KeyphraseInput): PaperData {
  const focus: KeyphraseInput = keyphrase ??
    input.keyphrases[0] ?? { text: input.keyphrase, synonyms: [] };

  return new Paper(input.contentHtml, {
    keyword: focus.text,
    synonyms: focus.synonyms.join(", "),
    title: input.title,
    titleWidth: input.title ? getTitleProgressGuarded(input.title).actual : 0,
    description: input.description,
    slug: input.slug,
    permalink: input.site.baseUrl ? `${input.site.baseUrl}/${input.slug}` : input.slug,
    locale: input.locale,
  });
}
