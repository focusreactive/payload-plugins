import { Paper } from "yoastseo";
import type { AnalysisInput } from "./types/analysis";
import type { PaperData } from "./types/paper";

export function buildPaper(input: AnalysisInput): PaperData {
  return new Paper(input.contentHtml, {
    keyword: input.keyphrase,
    title: input.title,
    titleWidth: 0,
    description: input.description,
    slug: input.slug,
    permalink: input.site.baseUrl ? `${input.site.baseUrl}/${input.slug}` : input.slug,
    locale: input.locale,
  });
}
