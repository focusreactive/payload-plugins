import type { AnalysisInput, SerpResult } from "../../types/analysis";

/** The document's public URL: the resolved path when the app registered one, else `/<slug>`. */
export function documentUrl(input: Pick<AnalysisInput, "path" | "site" | "slug">): string {
  const path = input.path ?? `/${input.slug}`;
  return input.site.baseUrl ? `${input.site.baseUrl.replace(/\/+$/u, "")}${path}` : path;
}

export function deriveSerp(input: AnalysisInput): SerpResult {
  return {
    title: input.title,
    url: documentUrl(input),
    description: input.description,
    siteName: input.site.name,
  };
}
