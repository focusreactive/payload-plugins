import type { LiveRichTextIdentity } from "../liveRichTextOf.js";
import type { BaseValues } from "./baseValues.js";
import type { RenderUnsavedRichText, RenderUnsavedRichTextOnThePage } from "./liveRichText.js";
import type { ValueSource } from "./valueSource.js";

import { isMetaInfo } from "../../../shared/shared.js";
import { keyedFieldAddressOf } from "../../../shared/veDocument.js";
import { listenToPreviewGrants } from "../../previewGrant.js";
import { createBaseValues } from "./baseValues.js";
import { optimisticValueOf } from "./optimisticValue.js";
import { valueSourceOf } from "./valueSource.js";

export type RenderValue<Node> = (
  value: unknown,
  signal: AbortSignal
) => Node | null | undefined | PromiseLike<Node | null>;

export type RenderedOnThePage<Node> = {
  optimistic: RenderUnsavedRichTextOnThePage<Node>;
  stop: () => void;
};

export type PayloadValues = { bases: BaseValues; source: ValueSource; stop: () => void };

const NEVER_ABORTED = new AbortController().signal;

const watchNothing = (): void => undefined;

const NO_BASE = { base: null };

export const renderedOnThePage = <Node>(
  { field, hasReferences, meta }: LiveRichTextIdentity,
  bases: BaseValues | null,
  renderValue: RenderValue<Node>,
  onBase: () => void
): RenderedOnThePage<Node> | null => {
  if (!isMetaInfo(meta) || typeof hasReferences !== "boolean") return null;
  const valueField = { fieldAddress: keyedFieldAddressOf(field), meta };
  const baseIn = (locale: string | undefined, state: unknown) =>
    bases ? bases.baseOf(field, locale, state) : hasReferences ? null : NO_BASE;
  return {
    optimistic: ({ locale, state }) => {
      const found = baseIn(locale, state);
      const value = found && optimisticValueOf(state, valueField, found.base);
      return value && (renderValue(value, NEVER_ABORTED) ?? null);
    },
    stop: bases ? bases.watch(field, hasReferences, onBase) : watchNothing,
  };
};

export const renderedThroughPayload =
  <Node>({
    bases,
    renderValue,
    source,
  }: {
    bases: BaseValues | null;
    renderValue: RenderValue<Node>;
    source: ValueSource;
  }): RenderUnsavedRichText<Node> =>
  async (request, signal) => {
    const answered = bases?.answerFor(request.field, request.locale);
    const value = await source.value(request, signal);
    if (value === null) return null;
    answered?.(value);
    return renderValue(value, signal);
  };

export function listenToPayloadValues(
  adminOrigin: () => string,
  payloadApi: string
): PayloadValues {
  const grants = listenToPreviewGrants(adminOrigin);
  const source = valueSourceOf({ grants, payloadApi });
  const bases = createBaseValues(adminOrigin, source);
  return {
    bases,
    source,
    stop() {
      bases.stop();
      grants.stop();
    },
  };
}
