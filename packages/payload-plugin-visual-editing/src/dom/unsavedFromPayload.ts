import type { PreviewGrantListener } from "../client/previewGrant.js";
import type { RenderRichTextHtml } from "./liveRichTextElements.js";

import { isPlainObject } from "../shared/plainObject.js";
import { VE_UNSAVED_RICH_TEXT_PATH } from "../shared/protocol.js";

export type RenderRichTextValue = (
  value: unknown,
  signal: AbortSignal
) => string | null | Promise<string | null>;

type FromPayload = {
  payloadApi: string;
  grants: PreviewGrantListener;
  renderValue: RenderRichTextValue | undefined;
};

const HTML_FORMAT = "html";
const JSON_FORMAT = "json";

export const renderInPayload =
  ({ grants, payloadApi, renderValue }: FromPayload): RenderRichTextHtml =>
  async (request, signal) => {
    const grant = grants.current();
    if (!grant) return null;

    const response = await fetch(`${payloadApi}${VE_UNSAVED_RICH_TEXT_PATH}`, {
      body: JSON.stringify({ format: renderValue ? JSON_FORMAT : HTML_FORMAT, grant, request }),
      headers: { "Content-Type": "text/plain" },
      method: "POST",
      signal,
    });
    if (!response.ok) return null;

    const answer: unknown = await response.json();
    if (!isPlainObject(answer)) return null;
    if (!renderValue) return typeof answer.html === "string" ? answer.html : null;
    return answer.value === null || answer.value === undefined
      ? null
      : renderValue(answer.value, signal);
  };
