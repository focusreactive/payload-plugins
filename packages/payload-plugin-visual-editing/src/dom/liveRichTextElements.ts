import type { LiveRichTextIdentity } from "../client/instantPreview/liveRichTextOf.js";
import type {
  LiveRichText,
  RenderUnsavedRichText,
} from "../client/instantPreview/unsavedRender/liveRichText.js";
import type {
  RenderSources,
  RichTextRenders,
} from "../client/instantPreview/unsavedRender/renderSources.js";
import type { OverlayScope } from "../client/overlayScope.js";

import { liveRichTextOf } from "../client/instantPreview/liveRichTextOf.js";
import { startLiveRichText } from "../client/overlayScope.js";
import { withVisualEditingPath } from "../client/withVisualEditingPath.js";
import { isPlainObject } from "../shared/plainObject.js";
import { DATA_VE_LIVE_RICH_TEXT_ATTR } from "../shared/protocol.js";

export type RenderRichTextHtml = RenderUnsavedRichText<string>;

export type RenderRichTextValue = (
  value: unknown,
  signal: AbortSignal
) => string | null | Promise<string | null>;

const stopNothing = (): void => undefined;

const identityOf = (element: Element): LiveRichTextIdentity | null => {
  try {
    const identity: unknown = JSON.parse(element.getAttribute(DATA_VE_LIVE_RICH_TEXT_ATTR) ?? "");
    const isIdentity =
      isPlainObject(identity) &&
      isPlainObject(identity.field) &&
      typeof identity.shape === "string";
    return isIdentity ? (identity as LiveRichTextIdentity) : null;
  } catch {
    return null;
  }
};

export const richTextAttributes = (value: unknown): Record<string, string> => {
  const identity = liveRichTextOf(value);
  return {
    ...withVisualEditingPath(value),
    ...(identity && { [DATA_VE_LIVE_RICH_TEXT_ATTR]: JSON.stringify(identity) }),
  };
};

const startElement = (
  element: Element,
  identity: LiveRichTextIdentity,
  scope: OverlayScope,
  adminOrigin: () => string,
  sources: RenderSources,
  renders: RichTextRenders<string>
): (() => void) => {
  const saved = { node: element.innerHTML, shape: identity.shape };
  let live: LiveRichText<string> | null = null;
  const local = sources.onThePage(identity, renders, () => live?.renderOnThePageAgain());
  let inserted = saved.node;
  const started = startLiveRichText<string>(scope, {
    adminOrigin,
    field: identity.field,
    onChange: (snapshot) => {
      const shown = started.shownFor(snapshot, saved);
      if (shown.node !== inserted) {
        inserted = shown.node;
        element.innerHTML = shown.node;
      }
      shown.commit();
    },
    optimistic: local?.optimistic,
    render: (request, signal) => sources.render(renders, request, signal),
    savedShape: identity.shape,
  });
  live = started;
  return () => {
    started.stop();
    local?.stop();
  };
};

export function startLiveRichTextElements(
  root: HTMLElement,
  scope: OverlayScope,
  adminOrigin: () => string,
  sources: RenderSources,
  renders: RichTextRenders<string>
): () => void {
  if (!sources.canShow(renders)) return stopNothing;
  const stops = [...root.querySelectorAll(`[${DATA_VE_LIVE_RICH_TEXT_ATTR}]`)].flatMap(
    (element) => {
      const identity = identityOf(element);
      return identity
        ? [startElement(element, identity, scope, adminOrigin, sources, renders)]
        : [];
    }
  );
  return () => {
    for (const stop of stops) stop();
  };
}
