"use client";

import { useConfig, useForm } from "@payloadcms/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LINK_SUGGESTIONS_ENDPOINT_PATH } from "../../../constants";
import type { AnalysisInput } from "../../../engine/types/analysis";
import { hasDocIdentity } from "../../../keyphrases/usage";
import type { LinkSuggestion } from "../../../links/types";
import { readContent } from "./readContent";
import { readInternalLinks } from "./readInternalLinks";

export type LinkSuggestionsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; suggestions: LinkSuggestion[] };

interface UseLinkSuggestionsOptions {
  collectionSlug: string;
  docId: string;
  localeCode: string;
  getInput: (opts?: { live?: boolean }) => Promise<AnalysisInput>;
}

export interface LinkSuggestions {
  state: LinkSuggestionsState;
  find: () => Promise<void>;
}

interface LinkSuggestionsResponse {
  suggestions?: unknown;
}

const MATCH_TEXT_KEYS = ["phrase", "snippet"] as const;

function isRangeWithin(value: unknown, text: string): boolean {
  if (typeof value !== "object" || value === null) return false;

  const { start, end }: Record<string, unknown> = { ...value };

  return (
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    Number(start) >= 0 &&
    Number(start) <= Number(end) &&
    Number(end) <= text.length
  );
}

function isLinkSuggestion(value: unknown): value is LinkSuggestion {
  if (!hasDocIdentity(value)) return false;

  const item: Record<string, unknown> = { ...value };
  const hasText = MATCH_TEXT_KEYS.every((key) => typeof item[key] === "string");
  const hasUrl = item.url === null || typeof item.url === "string";
  const hasMatch =
    typeof item.snippet === "string" && isRangeWithin(item.snippetMatch, item.snippet);

  return hasText && hasUrl && hasMatch && typeof item.count === "number";
}

function readSuggestions(body: LinkSuggestionsResponse): LinkSuggestion[] {
  return Array.isArray(body.suggestions) ? body.suggestions.filter(isLinkSuggestion) : [];
}

export function useLinkSuggestions({
  collectionSlug,
  docId,
  localeCode,
  getInput,
}: UseLinkSuggestionsOptions): LinkSuggestions {
  const { config } = useConfig();
  const { getData } = useForm();
  const [state, setState] = useState<LinkSuggestionsState>({ status: "idle" });
  const requestRef = useRef<AbortController | null>(null);
  const apiRoute = config.routes.api;

  useEffect(() => () => requestRef.current?.abort(), []);

  const requestSuggestions = useCallback(
    async (signal: AbortSignal): Promise<LinkSuggestionsState> => {
      try {
        const { contentHtml } = await getInput({ live: true });
        const { text, hrefs } = readContent(contentHtml);

        const res = await fetch(`${apiRoute}${LINK_SUGGESTIONS_ENDPOINT_PATH}`, {
          method: "POST",
          credentials: "include",
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collection: collectionSlug,
            docId,
            locale: localeCode,
            text,
            linkedHrefs: hrefs,
            linkedDocs: readInternalLinks(getData()),
          }),
        });
        if (!res.ok) return { status: "error" };

        const body: LinkSuggestionsResponse = await res.json();

        return { status: "done", suggestions: readSuggestions(body) };
      } catch {
        return { status: "error" };
      }
    },
    [apiRoute, collectionSlug, docId, getData, getInput, localeCode]
  );

  const find = useCallback(async () => {
    if (requestRef.current) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setState({ status: "loading" });

    const next = await requestSuggestions(controller.signal);
    if (controller.signal.aborted) return;

    requestRef.current = null;
    setState(next);
  }, [requestSuggestions]);

  return useMemo(() => ({ state, find }), [state, find]);
}
