import type { Overlay } from "./createOverlay.js";
import type { RichTextEditorLoader } from "./inlineEditing/richTextEditor.js";
import type { BuildImageUrl } from "./inlineEditing/shownImage.js";
import type { MarkerCleaner } from "./overlay/markerCleaner.js";
import type { OverlayScope, ScopedOverlayCtx } from "./overlayScope.js";
import type { Session } from "./session.js";
import type { Toggle } from "./toggle.js";
import type { VisualEditingMode } from "./visualEditingMode.js";

import { cleanPageAround } from "./overlay/markerCleaner.js";
import { startOverlay } from "./overlayScope.js";
import { createToggle } from "./toggle.js";

export interface FollowingSession {
  sync(): void;
  dispose(): void;
}

const NO_PAGE_EDITING: PageEditing = {};

type RunningOverlay = { overlay: Overlay; hasInstantPreview: boolean };

export type PageEditing = {
  onEdited?: () => void;
  richTextEditor?: RichTextEditorLoader;
  buildImageUrl?: BuildImageUrl;
};

const overlayCtxOf = (session: Session, pageEditing: PageEditing): ScopedOverlayCtx => ({
  ...pageEditing,
  adminBasePath: session.adminBasePath,
  adminOrigin: session.adminOrigin,
  buildAdminEditUrl: session.buildAdminEditUrl,
  inlineEditing: session.isInlineEditingOn,
  instantPreview: session.isInstantPreviewOn,
  mode: session.enabled ? session.mode : "off",
  payloadApi: session.payloadApi,
});

export function startSessionOverlay(
  root: HTMLElement,
  scope: () => OverlayScope,
  session: () => Session,
  pageEditing: () => PageEditing = () => NO_PAGE_EDITING
): FollowingSession {
  let running: RunningOverlay | null = null;
  let cleaner: MarkerCleaner | null = null;

  const stopOverlay = () => {
    running?.overlay.dispose();
    running = null;
  };

  const stopCleaner = () => {
    cleaner?.dispose();
    cleaner = null;
  };

  const runOverlay = (hasInstantPreview: boolean) => {
    if (running?.hasInstantPreview === hasInstantPreview) return;
    stopCleaner();
    stopOverlay();
    const overlay = startOverlay(scope, root, () => overlayCtxOf(session(), pageEditing()));
    running = { hasInstantPreview, overlay };
  };

  const runWithoutOverlay = (isDraft: boolean) => {
    stopOverlay();
    if (!isDraft) stopCleaner();
    else cleaner ??= cleanPageAround(root);
  };

  const sync = () => {
    const { enabled, isDraft, isInstantPreviewOn } = session();
    if (enabled || isInstantPreviewOn) runOverlay(isInstantPreviewOn);
    else runWithoutOverlay(isDraft);
    running?.overlay.applyMode();
  };
  sync();

  return {
    dispose() {
      stopOverlay();
      stopCleaner();
    },
    sync,
  };
}

export function startSessionToggle(
  doc: Document,
  session: () => Session,
  setMode: (mode: VisualEditingMode) => void
): FollowingSession {
  let toggle: Toggle | null = null;

  const remove = () => {
    toggle?.remove();
    toggle = null;
  };

  const sync = () => {
    const { available, mode } = session();
    if (!available) {
      remove();
      return;
    }
    toggle ??= createToggle(doc, setMode);
    toggle.show(mode);
  };
  sync();

  return { dispose: remove, sync };
}
