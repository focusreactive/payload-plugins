"use client";

import { useAllFormFields, useDebounce, useLocale } from "@payloadcms/ui";
import { useCallback, useMemo, useRef } from "react";
import { reduceFieldsToValues } from "payload/shared";
import type { ExtractorFn } from "../../content/resolveExtractor";
import type { AnalysisInput } from "../../engine/types";
import type { SeoFieldPaths } from "../../types/config";
import { buildInput } from "./buildInput";

const DEBOUNCE_MS = 1000;

export interface LiveDocArgs {
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  keyphrase: string;
  enabled?: boolean;
  override?: ExtractorFn;
}

export interface UseLiveDocumentResult {
  input: AnalysisInput;
  getLiveInput: () => AnalysisInput;
}

export function useLiveDocument({ fields, site, keyphrase, enabled = true, override }: LiveDocArgs): UseLiveDocumentResult {
  const [formFields] = useAllFormFields();
  const locale = useLocale();

  const debouncedFields = useDebounce(formFields, DEBOUNCE_MS);
  const debouncedKeyphrase = useDebounce(keyphrase, DEBOUNCE_MS);

  const values = useMemo<Record<string, unknown>>(() => (enabled ? (reduceFieldsToValues(debouncedFields, true) as Record<string, unknown>) : {}), [enabled, debouncedFields]);

  const input = useMemo<AnalysisInput>(
    () =>
      buildInput({
        values,
        locale,
        keyphrase: debouncedKeyphrase,
        fields,
        site,
        override,
      }),
    [values, locale, debouncedKeyphrase, fields, site.name, site.baseUrl, override]
  );

  const liveRef = useRef({
    formFields,
    locale,
    keyphrase,
    fields,
    site,
    override,
  });
  liveRef.current = {
    formFields,
    locale,
    keyphrase,
    fields,
    site,
    override,
  };

  const getLiveInput = useCallback((): AnalysisInput => {
    const live = liveRef.current;
    const liveValues = reduceFieldsToValues(live.formFields, true) as Record<string, unknown>;

    return buildInput({
      values: liveValues,
      locale: live.locale,
      keyphrase: live.keyphrase,
      fields: live.fields,
      site: live.site,
      override: live.override,
    });
  }, []);

  return { input, getLiveInput };
}
