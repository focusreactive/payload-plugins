import type { LiveRichTextIdentity } from "../client/instantPreview/liveRichTextOf.js";
import type { RenderUnsavedRichText } from "../client/instantPreview/unsavedRender/liveRichText.js";
import type { OverlayScope } from "../client/overlayScope.js";

import { liveRichTextOf } from "../client/instantPreview/liveRichTextOf.js";
import { startLiveRichText } from "../client/overlayScope.js";
import { withVisualEditingPath } from "../client/withVisualEditingPath.js";
import { isPlainObject } from "../shared/plainObject.js";

export const DATA_VE_LIVE_RICH_TEXT_ATTR = "data-ve-live-rich-text";

export type RenderRichTextHtml = RenderUnsavedRichText<string>;

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
  { field, shape }: LiveRichTextIdentity,
  scope: OverlayScope,
  adminOrigin: () => string,
  render: RenderRichTextHtml
): (() => void) => {
  const saved = { node: element.innerHTML, shape };
  let inserted = saved.node;
  const live = startLiveRichText<string>(scope, {
    adminOrigin,
    field,
    onChange: (snapshot) => {
      const shown = live.shownFor(snapshot, saved);
      if (shown.node !== inserted) {
        inserted = shown.node;
        element.innerHTML = shown.node;
      }
      shown.commit();
    },
    render,
    savedShape: shape,
  });
  return live.stop;
};

export function startLiveRichTextElements(
  root: HTMLElement,
  scope: OverlayScope,
  adminOrigin: () => string,
  render: RenderRichTextHtml
): () => void {
  const stops = [...root.querySelectorAll(`[${DATA_VE_LIVE_RICH_TEXT_ATTR}]`)].flatMap(
    (element) => {
      const identity = identityOf(element);
      return identity ? [startElement(element, identity, scope, adminOrigin, render)] : [];
    }
  );
  return () => {
    for (const stop of stops) stop();
  };
}
