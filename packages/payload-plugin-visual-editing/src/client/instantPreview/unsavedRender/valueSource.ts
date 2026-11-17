import type { LiveRichTextField, LiveRichTextRequest } from "../../../shared/protocol.js";

import { isPlainObject } from "../../../shared/plainObject.js";
import { VE_UNSAVED_RICH_TEXT_PATH } from "../../../shared/protocol.js";

export type SavedRichTextRequest = { field: LiveRichTextField; locale?: string };

export type Grants = { current(): string | null };

export interface ValueSource {
  canAsk(): boolean;
  value(
    request: LiveRichTextRequest | SavedRichTextRequest,
    signal?: AbortSignal
  ): Promise<unknown>;
  html(request: LiveRichTextRequest, signal: AbortSignal): Promise<string | null>;
}

const HTML_FORMAT = "html";
const JSON_FORMAT = "json";

type Format = typeof HTML_FORMAT | typeof JSON_FORMAT;

export function valueSourceOf({
  grants,
  payloadApi,
}: {
  grants: Grants;
  payloadApi: string;
}): ValueSource {
  const answerOf = async (
    format: Format,
    request: LiveRichTextRequest | SavedRichTextRequest,
    signal: AbortSignal | undefined
  ) => {
    const grant = grants.current();
    if (!grant) return null;

    const response = await fetch(`${payloadApi}${VE_UNSAVED_RICH_TEXT_PATH}`, {
      body: JSON.stringify({ format, grant, request }),
      headers: { "Content-Type": "text/plain" },
      method: "POST",
      signal,
    });
    if (!response.ok) return null;
    const answer: unknown = await response.json();
    return isPlainObject(answer) ? answer : null;
  };

  return {
    canAsk: () => grants.current() !== null,
    async html(request, signal) {
      const answer = await answerOf(HTML_FORMAT, request, signal);
      return typeof answer?.html === "string" ? answer.html : null;
    },
    async value(request, signal) {
      const answer = await answerOf(JSON_FORMAT, request, signal);
      return answer?.value ?? null;
    },
  };
}
