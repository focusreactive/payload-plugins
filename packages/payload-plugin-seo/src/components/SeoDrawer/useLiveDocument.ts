"use client";

import { useAllFormFields, useConfig, useDebounce, useLocale } from "@payloadcms/ui";
import type { ClientField } from "payload";
import { reduceFieldsToValues } from "payload/shared";
import { useCallback, useMemo, useRef } from "react";
import { createMediaResolver } from "../../content/uploads/media-resolver";
import type { UploadWalkContext } from "../../content/uploads/transform-upload-values";
import type { AnalysisInput } from "../../engine/types/analysis";
import type { ExtractorFn, SeoFieldPaths } from "../../types/config";
import { buildAnalysisInput } from "./build-analysis-input";

const DEBOUNCE_MS = 1000;

export interface LiveDocArgs {
  collectionSlug: string;
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  keyphrase: string;
  enabled?: boolean;
  override?: ExtractorFn;
}

export interface UseLiveDocumentResult {
  signature: string;
  getInput: (opts?: { live?: boolean }) => Promise<AnalysisInput>;
  invalidateMedia: () => void;
}

export function useLiveDocument({ collectionSlug, fields, site, keyphrase, enabled = true, override }: LiveDocArgs): UseLiveDocumentResult {
  const [formFields] = useAllFormFields();
  const locale = useLocale();
  const { config, getEntityConfig } = useConfig();

  const debouncedFields = useDebounce(formFields, DEBOUNCE_MS);
  const debouncedKeyphrase = useDebounce(keyphrase, DEBOUNCE_MS);

  const resolver = useMemo(() => createMediaResolver(config.routes.api), [config.routes.api]);

  const schemaFields = useMemo<ClientField[]>(() => {
    const entity = getEntityConfig({
      collectionSlug: collectionSlug as never,
    }) as { fields?: ClientField[] } | undefined;

    return entity?.fields ?? [];
  }, [getEntityConfig, collectionSlug]);

  const walkCtx = useMemo<UploadWalkContext>(
    () => ({
      isUploadCollection: (slug) => Boolean(config.collections?.find((c) => c.slug === slug)?.upload),
      blocksBySlug: { ...config.blocksMap },
    }),
    [config]
  );

  const values = useMemo<Record<string, unknown>>(() => (enabled ? (reduceFieldsToValues(debouncedFields, true) as Record<string, unknown>) : {}), [enabled, debouncedFields]);

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
    override,
    schemaFields,
    walkCtx,
    resolver,
  });
  liveRef.current = {
    formFields,
    values,
    keyphrase,
    debouncedKeyphrase,
    locale,
    fields,
    site,
    override,
    schemaFields,
    walkCtx,
    resolver,
  };

  const getInput = useCallback(async ({ live = false }: { live?: boolean } = {}): Promise<AnalysisInput> => {
    const s = liveRef.current;
    const inputValues = live ? (reduceFieldsToValues(s.formFields, true) as Record<string, unknown>) : s.values;

    return buildAnalysisInput({
      values: inputValues,
      locale: s.locale,
      payloadLocale: s.locale?.code,
      keyphrase: live ? s.keyphrase : s.debouncedKeyphrase,
      fields: s.fields,
      site: s.site,
      schemaFields: s.schemaFields,
      walkCtx: s.walkCtx,
      resolver: s.resolver,
      override: s.override,
    });
  }, []);

  const invalidateMedia = useCallback(() => liveRef.current.resolver.invalidate(), []);

  return { signature, getInput, invalidateMedia };
}
