import type { Overlay, OverlayCtx } from "./createOverlay.js";
import type {
  LiveRichText,
  LiveRichTextOptions,
} from "./instantPreview/unsavedRender/liveRichText.js";
import type { SavedRichTextShapes } from "./instantPreview/unsavedRender/savedShapes.js";

import { adminOriginOf } from "./adminWindow.js";
import { createOverlay } from "./createOverlay.js";
import { createLiveRichText } from "./instantPreview/unsavedRender/liveRichText.js";
import { createSavedRichTextShapes } from "./instantPreview/unsavedRender/savedShapes.js";

export type OverlayScope = { locale: string | undefined; savedShapes: SavedRichTextShapes };

export type ScopedOverlayCtx = Omit<OverlayCtx, "keepsRichTextShape" | "locale">;

export type ScopedLiveRichTextOptions<Node> = Omit<
  LiveRichTextOptions<Node>,
  "adminPage" | "savedShapes"
> & { adminOrigin: () => string };

export const savedShapesWithin = (outer: OverlayScope | null): SavedRichTextShapes =>
  outer?.savedShapes ?? createSavedRichTextShapes();

export const startOverlay = (
  scope: () => OverlayScope,
  root: HTMLElement,
  getCtx: () => ScopedOverlayCtx
): Overlay =>
  createOverlay(root, () => {
    const { locale, savedShapes } = scope();
    return { ...getCtx(), keepsRichTextShape: savedShapes.keeps, locale };
  });

export const startLiveRichText = <Node>(
  scope: OverlayScope | null,
  { adminOrigin, ...options }: ScopedLiveRichTextOptions<Node>
): LiveRichText<Node> =>
  createLiveRichText({
    ...options,
    adminPage: () => ({ adminOrigin: adminOriginOf(adminOrigin()), locale: scope?.locale }),
    savedShapes: scope?.savedShapes ?? null,
  });
