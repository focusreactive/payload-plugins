"use client";

import { useMemo } from "react";
import { useAllFormFields, useLocale } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";
import { resolveExtractor } from "../../content/resolveExtractor";
import type { ExtractorFn } from "../../content/resolveExtractor";
import type { SeoFieldPaths } from "../../types/config";
import type { AnalysisInput } from "../../engine/types";

export interface LiveDocArgs {
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  keyphrase: string;
  override?: ExtractorFn;
}

function valueAt(values: Record<string, unknown>, path?: string): string {
  if (!path) return "";

  const v = path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), values);

  return typeof v === "string" ? v : "";
}

export function useLiveDocument({ fields, site, keyphrase, override }: LiveDocArgs): AnalysisInput {
  const [formFields] = useAllFormFields();
  const locale = useLocale();

  return useMemo(() => {
    const values = reduceFieldsToValues(formFields, true) as Record<string, unknown>;

    const extractor = resolveExtractor(override, fields);
    const title = valueAt(values, fields.seoTitle) || valueAt(values, "title");
    const localeCode = (typeof locale === "object" && locale ? (locale as { code?: string }).code : String(locale)) ?? "en";

    return {
      title,
      slug: valueAt(values, fields.slug ?? "slug"),
      description: valueAt(values, fields.metaDescription),
      contentHtml: extractor(values),
      keyphrase,
      locale: localeCode.includes("_") ? localeCode : `${localeCode}_${localeCode.toUpperCase()}`,
      site,
      has: {
        seoTitle: Boolean(fields.seoTitle && valueAt(values, fields.seoTitle)),
        metaDescription: Boolean(fields.metaDescription),
        slug: Boolean(fields.slug ?? "slug"),
        content: Boolean(fields.content),
      },
    };
  }, [formFields, locale, fields, site, keyphrase, override]);
}
