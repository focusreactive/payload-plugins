import type { Overlay } from "./createOverlay.js";
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

type RunningOverlay = { overlay: Overlay; hasInstantPreview: boolean };

const overlayCtxOf = (session: Session): ScopedOverlayCtx => ({
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
  session: () => Session
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
    const overlay = startOverlay(scope, root, () => overlayCtxOf(session()));
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

export type ToggleActions = {
  setMode: (mode: VisualEditingMode) => void;
  setEditsInPlace: (editsInPlace: boolean) => void;
};

export function startSessionToggle(
  doc: Document,
  session: () => Session,
  { setEditsInPlace, setMode }: ToggleActions
): FollowingSession {
  let toggle: Toggle | null = null;

  const remove = () => {
    toggle?.remove();
    toggle = null;
  };

  const sync = () => {
    const { available, editsInPlace, inlineEditing, mode } = session();
    if (!available) {
      remove();
      return;
    }
    toggle ??= createToggle(doc, setMode, setEditsInPlace);
    toggle.show(mode, inlineEditing ? editsInPlace : undefined);
  };
  sync();

  return { dispose: remove, sync };
}
