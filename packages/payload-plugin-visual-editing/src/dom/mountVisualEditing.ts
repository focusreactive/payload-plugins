import type { Overlay } from "../client/createOverlay.js";
import type { OverlayScope } from "../client/overlayScope.js";
import type { SessionOptions } from "../client/session.js";
import type { Toggle } from "../client/toggle.js";
import type { RenderRichTextHtml } from "./liveRichTextElements.js";

import { savedShapesWithin, startOverlay } from "../client/overlayScope.js";
import { listenToSaves } from "../client/saveEvents.js";
import { createPageStore, sessionOf } from "../client/session.js";
import { createToggle } from "../client/toggle.js";
import { startLiveRichTextElements } from "./liveRichTextElements.js";

export type MountVisualEditingOptions = SessionOptions & {
  root?: HTMLElement;
  locale?: string;
  toggle?: boolean;
  renderRichText?: RenderRichTextHtml;
  onSave?: () => void;
};

export interface VisualEditing {
  destroy(): void;
}

export function mountVisualEditing({
  root = document.body,
  locale,
  toggle: showsToggle = true,
  renderRichText,
  onSave,
  ...sessionOptions
}: MountVisualEditingOptions = {}): VisualEditing {
  const pageStore = createPageStore();
  pageStore.attach(window);
  const session = () => sessionOf({ available: true, ...sessionOptions }, pageStore.read());
  const adminOrigin = () => session().adminOrigin;
  const scope: OverlayScope = { locale, savedShapes: savedShapesWithin(null) };
  const { available, instantPreview } = session();
  const isInstantPreviewOn = available && instantPreview;

  const stopLiveRichTexts =
    isInstantPreviewOn && renderRichText
      ? startLiveRichTextElements(root, scope, adminOrigin, renderRichText)
      : null;

  const toggle: Toggle | null =
    showsToggle && available ? createToggle(document, pageStore.setMode) : null;
  let overlay: Overlay | null = null;
  const followSession = () => {
    const { enabled, mode } = session();
    const isActive = enabled || isInstantPreviewOn;
    if (isActive && !overlay) {
      overlay = startOverlay(
        () => scope,
        root,
        () => {
          const current = session();
          return {
            adminBasePath: current.adminBasePath,
            adminOrigin: current.adminOrigin,
            buildAdminEditUrl: current.buildAdminEditUrl,
            instantPreview: isInstantPreviewOn,
            mode: current.enabled ? current.mode : "off",
          };
        }
      );
    } else if (!isActive && overlay) {
      overlay.dispose();
      overlay = null;
    }
    overlay?.applyMode();
    toggle?.show(mode);
  };

  const stopFollowing = pageStore.subscribe(followSession);
  const stopListeningToSaves = onSave && available ? listenToSaves(adminOrigin, onSave) : null;
  followSession();

  return {
    destroy() {
      stopFollowing();
      stopListeningToSaves?.();
      stopLiveRichTexts?.();
      overlay?.dispose();
      overlay = null;
      toggle?.remove();
    },
  };
}
