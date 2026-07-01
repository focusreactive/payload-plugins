"use client";

import { useAllFormFields, useConfig, useDebounce, useLocale } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";
import { useCallback, useMemo, useRef } from "react";
import { resolveContentExtractor } from "../../content/registry";
import type { AnalysisInput, KeyphraseInput } from "../../engine/types/analysis";
import type { SeoFieldPaths } from "../../types/config";
import { buildAnalysisInput } from "./build-analysis-input";

const erroredPaths = new Set<string>();
const DEBOUNCE_MS = 1000;

export function keyphraseSignature(keyphrases: KeyphraseInput[]): string {
  return JSON.stringify(keyphrases.map((k) => [k.text, k.synonyms]));
}

export interface LiveDocArgs {
  collectionSlug: string;
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  keyphrases: KeyphraseInput[];
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
  keyphrases,
  enabled = true,
  extractContentPath,
}: LiveDocArgs): UseLiveDocumentResult {
  const [formFields] = useAllFormFields();
  const locale = useLocale();
  const { config } = useConfig();

  const debouncedFields = useDebounce(formFields, DEBOUNCE_MS);
  const debouncedKeyphrases = useDebounce(keyphrases, DEBOUNCE_MS);
  const apiRoute = config.routes.api;

  const values = useMemo<Record<string, unknown>>(
    () => (enabled ? (reduceFieldsToValues(debouncedFields, true) as Record<string, unknown>) : {}),
    [enabled, debouncedFields]
  );

  const signature = useMemo(
    () =>
      JSON.stringify({
        values,
        keyphrases: keyphraseSignature(debouncedKeyphrases),
        locale: locale?.code ?? null,
      }),
    [values, debouncedKeyphrases, locale]
  );

  const liveRef = useRef({
    formFields,
    values,
    keyphrases,
    debouncedKeyphrases,
    locale,
    fields,
    site,
    extractContentPath,
    apiRoute,
  });
  liveRef.current = {
    formFields,
    values,
    keyphrases,
    debouncedKeyphrases,
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
        keyphrases: live ? s.keyphrases : s.debouncedKeyphrases,
        fields: s.fields,
        site: s.site,
        extractor,
      });
    },
    []
  );

  return { signature, getInput };
}
