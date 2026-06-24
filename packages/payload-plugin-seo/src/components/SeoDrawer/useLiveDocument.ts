"use client";

import { useAllFormFields, useConfig, useDebounce, useLocale } from "@payloadcms/ui";
import type { ClientField } from "payload";
import { reduceFieldsToValues } from "payload/shared";
import { useCallback, useMemo, useRef } from "react";
import { resolveContentExtractor } from "../../content/registry";
import { createDocResolver } from "../../content/resolve/resolver";
import type { ExtractContext } from "../../content/extract/context";
import type { AnalysisInput } from "../../engine/types/analysis";
import type { SeoFieldPaths } from "../../types/config";
import { buildAnalysisInput } from "./build-analysis-input";

const warnedPaths = new Set<string>();

const DEBOUNCE_MS = 1000;

export interface LiveDocArgs {
  collectionSlug: string;
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  keyphrase: string;
  enabled?: boolean;
  extractContentPath?: string | null;
  resolveDepth: number;
  slugPaths: Record<string, string>;
}

export interface UseLiveDocumentResult {
  signature: string;
  getInput: (opts?: { live?: boolean }) => Promise<AnalysisInput>;
  invalidateMedia: () => void;
}

export function useLiveDocument({
  collectionSlug,
  fields,
  site,
  keyphrase,
  enabled = true,
  extractContentPath,
  resolveDepth,
  slugPaths,
}: LiveDocArgs): UseLiveDocumentResult {
  const [formFields] = useAllFormFields();
  const locale = useLocale();
  const { config, getEntityConfig } = useConfig();

  const debouncedFields = useDebounce(formFields, DEBOUNCE_MS);
  const debouncedKeyphrase = useDebounce(keyphrase, DEBOUNCE_MS);

  const apiRoute = config.routes.api;
  const resolver = useMemo(() => createDocResolver(apiRoute), [apiRoute]);

  const getFields = useCallback(
    (slug: string): ClientField[] => {
      const entity = getEntityConfig({ collectionSlug: slug as never }) as
        | { fields?: ClientField[] }
        | undefined;
      return entity?.fields ?? [];
    },
    [getEntityConfig]
  );

  const hostFields = useMemo<ClientField[]>(
    () => getFields(collectionSlug),
    [getFields, collectionSlug]
  );

  const ctx = useMemo<ExtractContext>(
    () => ({
      getFields,
      isUploadCollection: (slug) =>
        Boolean(config.collections?.find((c) => c.slug === slug)?.upload),
      slugPath: (slug) => slugPaths[slug] ?? "slug",
      blocksBySlug: { ...config.blocksMap },
      resolved: new Map(),
      baseUrl: site.baseUrl,
    }),
    [getFields, config, slugPaths, site.baseUrl]
  );

  const values = useMemo<Record<string, unknown>>(
    () => (enabled ? (reduceFieldsToValues(debouncedFields, true) as Record<string, unknown>) : {}),
    [enabled, debouncedFields]
  );

  const signature = useMemo(
    () =>
      JSON.stringify({
        values,
        keyphrase: debouncedKeyphrase,
        locale: locale?.code ?? null,
      }),
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
    hostFields,
    ctx,
    resolver,
    resolveDepth,
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
    hostFields,
    ctx,
    resolver,
    resolveDepth,
    apiRoute,
  };

  const getInput = useCallback(
    async ({ live = false }: { live?: boolean } = {}): Promise<AnalysisInput> => {
      const s = liveRef.current;
      const inputValues = live
        ? (reduceFieldsToValues(s.formFields, true) as Record<string, unknown>)
        : s.values;

      const override = (() => {
        if (!s.extractContentPath) return undefined;

        const fn = resolveContentExtractor(s.extractContentPath);
        if (!fn && !warnedPaths.has(s.extractContentPath)) {
          warnedPaths.add(s.extractContentPath);
          console.warn(
            `[payload-plugin-seo] extractContentPath "${s.extractContentPath}" is not registered; falling back to the built-in extractor. Call registerContentExtractors from "@focus-reactive/payload-plugin-seo/content" in an admin-mounted client module.`
          );
        }
        return fn;
      })();

      return buildAnalysisInput({
        values: inputValues,
        locale: s.locale,
        payloadLocale: s.locale?.code,
        apiRoute: s.apiRoute,
        keyphrase: live ? s.keyphrase : s.debouncedKeyphrase,
        fields: s.fields,
        site: s.site,
        hostFields: s.hostFields,
        ctx: s.ctx,
        resolver: s.resolver,
        resolveDepth: s.resolveDepth,
        override,
      });
    },
    []
  );

  const invalidateMedia = useCallback(() => liveRef.current.resolver.invalidate(), []);

  return { signature, getInput, invalidateMedia };
}
