"use client";

import { useAllFormFields, useConfig, useDebounce, useLocale } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";
import { useCallback, useMemo, useRef } from "react";
import { resolveContentExtractor } from "../../content/registry";
import type { AnalysisInput } from "../../engine/types/analysis";
import type { SeoFieldPaths } from "../../types/config";
import { buildAnalysisInput } from "./build-analysis-input";

const erroredPaths = new Set<string>();
const DEBOUNCE_MS = 1000;

export interface LiveDocArgs {
  collectionSlug: string;
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  keyphrase: string;
  enabled?: boolean;
  extractContentPath: string;
}

export interface UseLiveDocumentResult {
  signature: string;
  getInput: (opts?: { live?: boolean }) => Promise<AnalysisInput>;
}

export function useLiveDocument({
  collectionSlug: _collectionSlug,
  fields,
  site,
  keyphrase,
  enabled = true,
  extractContentPath,
}: LiveDocArgs): UseLiveDocumentResult {
  const [formFields] = useAllFormFields();
  const locale = useLocale();
  const { config } = useConfig();

  const debouncedFields = useDebounce(formFields, DEBOUNCE_MS);
  const debouncedKeyphrase = useDebounce(keyphrase, DEBOUNCE_MS);
  const apiRoute = config.routes.api;

  const values = useMemo<Record<string, unknown>>(
    () => (enabled ? (reduceFieldsToValues(debouncedFields, true) as Record<string, unknown>) : {}),
    [enabled, debouncedFields]
  );

  const signature = useMemo(
    () => JSON.stringify({ values, keyphrase: debouncedKeyphrase, locale: locale?.code ?? null }),
    [values, debouncedKeyphrase, locale]
  );

  const liveRef = useRef({
    formFields,
    values,
    keyphrase,
    debouncedKeyphrase,
    locale,
    fields,
    site,
    extractContentPath,
    apiRoute,
  });
  liveRef.current = {
    formFields,
    values,
    keyphrase,
    debouncedKeyphrase,
    locale,
    fields,
    site,
    extractContentPath,
    apiRoute,
  };

  const getInput = useCallback(
    async ({ live = false }: { live?: boolean } = {}): Promise<AnalysisInput> => {
      const s = liveRef.current;
      const inputValues = live
        ? (reduceFieldsToValues(s.formFields, true) as Record<string, unknown>)
        : s.values;

      const extractor = resolveContentExtractor(s.extractContentPath);
      if (!extractor && !erroredPaths.has(s.extractContentPath)) {
        erroredPaths.add(s.extractContentPath);
        console.error(
          `[payload-plugin-seo] extractContentPath "${s.extractContentPath}" is not registered; content analysis will be empty. Call registerContentExtractors from "@focus-reactive/payload-plugin-seo/content" in an admin-mounted client module.`
        );
      }

      return buildAnalysisInput({
        values: inputValues,
        locale: s.locale,
        payloadLocale: s.locale?.code,
        apiRoute: s.apiRoute,
        keyphrase: live ? s.keyphrase : s.debouncedKeyphrase,
        fields: s.fields,
        site: s.site,
        extractor,
      });
    },
    []
  );

  return { signature, getInput };
}
