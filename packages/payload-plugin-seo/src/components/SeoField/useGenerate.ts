"use client";

import { useAllFormFields, useConfig, useDocumentInfo, useLocale } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";
import { useCallback, useRef, useState } from "react";
import { getSeoClientConfig } from "../../client-config/registry";
import { GENERATE_ENDPOINT_PATH } from "../../constants/generation";
import { createResolveDocs } from "../../content/resolve/resolve-docs";
import { resolveContentExtractor } from "../../content/registry";
import {
  compact,
  heading,
  html,
  image,
  link,
  paragraph,
  richText,
  video,
} from "../../content/schema/helpers";
import { serialize } from "../../content/schema/serialize";
import type { ContentHelpers } from "../../types/config";
import type { Measurement } from "../../measure/measure";
import type { SeoFieldKind } from "../../server/generate/prompts";

const helpers: ContentHelpers = {
  heading,
  paragraph,
  link,
  image,
  video,
  html,
  richText,
  compact,
};

export type GenerateStatus = "idle" | "loading" | "error";

interface UseGenerateProps {
  kind: SeoFieldKind;
  measurement: Measurement;
  setValue: (v: string) => void;
}

export function useGenerate({ kind, measurement, setValue }: UseGenerateProps) {
  const [formFields] = useAllFormFields();
  const { config } = useConfig();
  const { collectionSlug } = useDocumentInfo();
  const locale = useLocale();

  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const ref = useRef({
    formFields,
    collectionSlug,
    locale,
    apiRoute: config.routes.api,
  });
  ref.current = {
    formFields,
    collectionSlug,
    locale,
    apiRoute: config.routes.api,
  };

  const generate = useCallback(async () => {
    const { formFields: ff, collectionSlug: slug, locale: loc, apiRoute } = ref.current;

    const clientConfig = getSeoClientConfig();
    const extractPath = slug ? clientConfig.extractByCollection[slug] : undefined;

    const extractor = resolveContentExtractor(extractPath);
    if (!extractor) {
      setStatus("error");
      setError("No content extractor is registered for this collection.");

      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const values = reduceFieldsToValues(ff, true) as Record<string, unknown>;
      const localeCode = loc?.code;
      const ir = await extractor(
        values,
        { locale: localeCode, apiRoute },
        { resolveDocs: createResolveDocs(apiRoute, localeCode), helpers }
      );
      const contentHtml = serialize(ir);

      const res = await fetch(`${apiRoute}${GENERATE_ENDPOINT_PATH}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          contentHtml,
          locale: localeCode,
          range: { min: measurement.min, max: measurement.max, unit: measurement.unit },
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const body = (await res.json()) as { text?: string };
      if (!body.text) throw new Error("Empty response");

      setValue(body.text);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError((err as Error).message || "Generation failed");
    }
  }, [kind, measurement.min, measurement.max, measurement.unit, setValue]);

  return {
    generate,
    status,
    error,
  };
}
