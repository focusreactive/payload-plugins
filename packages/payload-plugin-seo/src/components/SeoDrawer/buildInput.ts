import type { ExtractorFn } from "../../content/resolveExtractor";
import { resolveExtractor } from "../../content/resolveExtractor";
import type { AnalysisInput } from "../../engine/types";
import type { SeoFieldPaths } from "../../types/config";

function valueAt(values: Record<string, unknown>, path?: string): string {
  if (!path) return "";

  const v = path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), values);

  return typeof v === "string" ? v : "";
}

function normalizeLocale(locale: string | { code?: string } | null | undefined): string {
  const code = (typeof locale === "object" && locale ? locale.code : locale != null ? String(locale) : undefined) ?? "en";

  return code.includes("_") ? code : `${code}_${code.toUpperCase()}`;
}

export interface BuildInputArgs {
  values: Record<string, unknown>;
  locale: string | { code?: string } | null | undefined;
  keyphrase: string;
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  override?: ExtractorFn;
}

export function buildInput({ values, locale, keyphrase, fields, site, override }: BuildInputArgs): AnalysisInput {
  const extractor = resolveExtractor(override, fields);
  const title = valueAt(values, fields.seoTitle) || valueAt(values, "title");

  return {
    title,
    slug: valueAt(values, fields.slug ?? "slug"),
    description: valueAt(values, fields.metaDescription),
    contentHtml: extractor(values),
    keyphrase,
    locale: normalizeLocale(locale),
    site,
    has: {
      seoTitle: Boolean(fields.seoTitle && valueAt(values, fields.seoTitle)),
      metaDescription: Boolean(fields.metaDescription),
      slug: Boolean(fields.slug ?? "slug"),
      content: Boolean(fields.content),
    },
  };
}
