import type { AnalysisInput, SerpResult } from "./types";

const AVG_GLYPH_PX = 8.5;

export function deriveSerp(input: AnalysisInput): SerpResult {
  const url = input.site.baseUrl ? `${input.site.baseUrl}/${input.slug}` : `/${input.slug}`;

  return {
    title: input.title,
    url,
    description: input.description,
    siteName: input.site.name,
    titleWidthPx: Math.round(input.title.length * AVG_GLYPH_PX),
    descriptionChars: input.description.length,
  };
}
