import type { AnalysisInput, SerpResult } from "../../types/analysis";

export function deriveSerp(input: AnalysisInput): SerpResult {
  const url = input.site.baseUrl ? `${input.site.baseUrl}/${input.slug}` : `/${input.slug}`;

  return {
    title: input.title,
    url,
    description: input.description,
    siteName: input.site.name,
  };
}
