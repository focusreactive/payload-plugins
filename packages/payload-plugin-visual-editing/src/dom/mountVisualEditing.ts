import type { Overlay } from "../client/createOverlay.js";
import type { OverlayScope } from "../client/overlayScope.js";
import type { SessionOptions } from "../client/session.js";
import type { MarkerCleaner } from "../client/overlay/markerCleaner.js";
import type { Toggle } from "../client/toggle.js";
import type { RenderRichTextHtml, RenderRichTextValue } from "./liveRichTextElements.js";

import { createBaseValues } from "../client/instantPreview/unsavedRender/baseValues.js";
import { valueSourceOf } from "../client/instantPreview/unsavedRender/valueSource.js";
import { cleanPageAround } from "../client/overlay/markerCleaner.js";
import { savedShapesWithin, startOverlay } from "../client/overlayScope.js";
import { listenToPreviewGrants } from "../client/previewGrant.js";
import { listenToSaves } from "../client/saveEvents.js";
import { createPageStore, payloadApiOf, sessionOf } from "../client/session.js";
import { createToggle } from "../client/toggle.js";
import { startLiveRichTextElements } from "./liveRichTextElements.js";
import { renderInPayload } from "./unsavedFromPayload.js";

export type MountVisualEditingOptions = SessionOptions & {
  root?: HTMLElement;
  locale?: string;
  toggle?: boolean;
  renderRichText?: RenderRichTextHtml;
  payloadApi?: string;
  renderRichTextValue?: RenderRichTextValue;
  optimistic?: boolean;
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
  payloadApi: namedPayloadApi,
  renderRichTextValue,
  optimistic = true,
  onSave,
  ...sessionOptions
}: MountVisualEditingOptions = {}): VisualEditing {
  const payloadApi = payloadApiOf({
    adminOrigin: sessionOptions.adminOrigin,
    payloadApi: namedPayloadApi,
  });
  const pageStore = createPageStore();
  pageStore.attach(window);
  const session = () => sessionOf({ available: true, ...sessionOptions }, pageStore.read());
  const adminOrigin = () => session().adminOrigin;
  const scope: OverlayScope = { locale, savedShapes: savedShapesWithin(null) };
  const { available, instantPreview, isDraft } = session();
  const isInstantPreviewOn = available && instantPreview;

  const grants = isInstantPreviewOn && payloadApi ? listenToPreviewGrants(adminOrigin) : null;
  const source = grants && payloadApi ? valueSourceOf({ grants, payloadApi }) : null;
  const bases =
    source && renderRichTextValue && optimistic ? createBaseValues(adminOrigin, source) : null;
  const render =
    renderRichText ??
    (source ? renderInPayload({ bases, renderValue: renderRichTextValue, source }) : null);
  const onThePage =
    bases && renderRichTextValue ? { bases, renderValue: renderRichTextValue } : null;
  const stopLiveRichTexts =
    isInstantPreviewOn && render
      ? startLiveRichTextElements(root, scope, adminOrigin, { onThePage, render })
      : null;

  const toggle: Toggle | null =
    showsToggle && available ? createToggle(document, pageStore.setMode) : null;
  let overlay: Overlay | null = null;
  let cleaner: MarkerCleaner | null = null;
  const followSession = () => {
    const { enabled, mode } = session();
    const isActive = enabled || isInstantPreviewOn;
    if (isActive) {
      cleaner?.dispose();
      cleaner = null;
      overlay ??= startOverlay(
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
    } else {
      overlay?.dispose();
      overlay = null;
      if (isDraft) cleaner ??= cleanPageAround(root);
    }
    overlay?.applyMode();
    toggle?.show(mode);
  };

  const stopFollowing = pageStore.subscribe(followSession);
  const stopListeningToSaves =
    onSave && available ? listenToSaves(adminOrigin, () => onSave()) : null;
  followSession();

  return {
    destroy() {
      stopFollowing();
      stopListeningToSaves?.();
      stopLiveRichTexts?.();
      bases?.stop();
      grants?.stop();
      overlay?.dispose();
      overlay = null;
      cleaner?.dispose();
      cleaner = null;
      toggle?.remove();
    },
  };
}
