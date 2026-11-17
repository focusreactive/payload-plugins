import type { LiveRichTextRequest } from "../../../shared/protocol.js";
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

export type RichTextRenders<Node> = {
  render?: RenderUnsavedRichText<Node> | null;
  renderValue?: RenderValue<Node>;
};

export type RenderedOnThePage<Node> = {
  optimistic: RenderUnsavedRichTextOnThePage<Node>;
  stop: () => void;
};

export type RenderSourcesOptions = {
  adminOrigin: () => string;
  payloadApi: string | undefined;
  rendersOnThePage?: boolean;
};

export interface RenderSources {
  htmlOfPayload: RenderUnsavedRichText<string> | null;
  canShow(renders: RichTextRenders<unknown>): boolean;
  render<Node>(
    renders: RichTextRenders<Node>,
    request: LiveRichTextRequest,
    signal: AbortSignal
  ): Promise<Node | null | undefined>;
  onThePage<Node>(
    identity: LiveRichTextIdentity,
    renders: RichTextRenders<Node>,
    onBase: () => void
  ): RenderedOnThePage<Node> | null;
  stop(): void;
}

type Sources = {
  source: ValueSource | null;
  bases: BaseValues | null;
  rendersOnThePage: boolean;
  stop: () => void;
};

const NEVER_ABORTED = new AbortController().signal;

const NO_BASE = { base: null };

const doNothing = (): void => undefined;

const renderedOnThePage = <Node>(
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
    stop: bases ? bases.watch(field, hasReferences, onBase) : doNothing,
  };
};

const renderedThroughPayload = async <Node>(
  { bases, source }: { bases: BaseValues | null; source: ValueSource },
  renderValue: RenderValue<Node>,
  request: LiveRichTextRequest,
  signal: AbortSignal
): Promise<Node | null | undefined> => {
  const answered = bases?.answerFor(request.field, request.locale);
  const value = await source.value(request, signal);
  if (value === null) return null;
  answered?.(value);
  return renderValue(value, signal);
};

const renderSourcesFrom = ({ bases, rendersOnThePage, source, stop }: Sources): RenderSources => ({
  canShow: ({ render, renderValue }) =>
    Boolean(render) || (renderValue !== undefined && (rendersOnThePage || source !== null)),
  htmlOfPayload: source && ((request, signal) => source.html(request, signal)),
  onThePage: (identity, { renderValue }, onBase) =>
    rendersOnThePage && renderValue
      ? renderedOnThePage(identity, bases, renderValue, onBase)
      : null,
  render: ({ render, renderValue }, request, signal) =>
    renderValue && source?.canAsk()
      ? renderedThroughPayload({ bases, source }, renderValue, request, signal)
      : (render?.(request, signal) ?? Promise.resolve(null)),
  stop,
});

export const RENDER_SOURCES_OF_THE_PAGE_ALONE: RenderSources = renderSourcesFrom({
  bases: null,
  rendersOnThePage: true,
  source: null,
  stop: doNothing,
});

export function listenToRenderSources({
  adminOrigin,
  payloadApi,
  rendersOnThePage = true,
}: RenderSourcesOptions): RenderSources {
  if (!payloadApi) {
    return renderSourcesFrom({ bases: null, rendersOnThePage, source: null, stop: doNothing });
  }
  const grants = listenToPreviewGrants(adminOrigin);
  const source = valueSourceOf({ grants, payloadApi });
  const bases = rendersOnThePage ? createBaseValues(adminOrigin, source) : null;
  return renderSourcesFrom({
    bases,
    rendersOnThePage,
    source,
    stop() {
      bases?.stop();
      grants.stop();
    },
  });
}
