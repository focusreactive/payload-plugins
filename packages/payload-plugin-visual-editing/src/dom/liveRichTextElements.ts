import type { LiveRichTextIdentity } from "../client/instantPreview/liveRichTextOf.js";
import type { BaseValues } from "../client/instantPreview/unsavedRender/baseValues.js";
import type {
  LiveRichText,
  RenderUnsavedRichText,
} from "../client/instantPreview/unsavedRender/liveRichText.js";
import type { OverlayScope } from "../client/overlayScope.js";

import { liveRichTextOf } from "../client/instantPreview/liveRichTextOf.js";
import { renderedOnThePage } from "../client/instantPreview/unsavedRender/renderValue.js";
import { startLiveRichText } from "../client/overlayScope.js";
import { withVisualEditingPath } from "../client/withVisualEditingPath.js";
import { isPlainObject } from "../shared/plainObject.js";

export const DATA_VE_LIVE_RICH_TEXT_ATTR = "data-ve-live-rich-text";

export type RenderRichTextHtml = RenderUnsavedRichText<string>;

export type RenderRichTextValue = (
  value: unknown,
  signal: AbortSignal
) => string | null | Promise<string | null>;

export type RenderOnThePage = { bases: BaseValues; renderValue: RenderRichTextValue };

type LiveRichTextRenders = { render: RenderRichTextHtml; onThePage: RenderOnThePage | null };

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
  { onThePage, render }: LiveRichTextRenders
): (() => void) => {
  const saved = { node: element.innerHTML, shape: identity.shape };
  let live: LiveRichText<string> | null = null;
  const local =
    onThePage &&
    renderedOnThePage(identity, onThePage.bases, onThePage.renderValue, () =>
      live?.renderOnThePageAgain()
    );
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
    render,
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
  renders: LiveRichTextRenders
): () => void {
  const stops = [...root.querySelectorAll(`[${DATA_VE_LIVE_RICH_TEXT_ATTR}]`)].flatMap(
    (element) => {
      const identity = identityOf(element);
      return identity ? [startElement(element, identity, scope, adminOrigin, renders)] : [];
    }
  );
  return () => {
    for (const stop of stops) stop();
  };
}
