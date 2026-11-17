import type { AccentOptions } from "../client/accent.js";
import type { OverlayScope } from "../client/overlayScope.js";
import type { SessionOptions } from "../client/session.js";
import type { RenderRichTextHtml, RenderRichTextValue } from "./liveRichTextElements.js";

import { applyAccent } from "../client/accent.js";
import { listenToRenderSources } from "../client/instantPreview/unsavedRender/renderSources.js";
import { savedShapesWithin } from "../client/overlayScope.js";
import { listenToSaves } from "../client/saveEvents.js";
import { createPageStore, payloadApiOf, sessionOf } from "../client/session.js";
import { startSessionOverlay, startSessionToggle } from "../client/sessionOverlay.js";
import { startLiveRichTextElements } from "./liveRichTextElements.js";

export type MountVisualEditingOptions = SessionOptions &
  AccentOptions & {
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
  accentColor,
  accentTextColor,
  ...sessionOptions
}: MountVisualEditingOptions = {}): VisualEditing {
  const removeAccent = applyAccent(document, { accentColor, accentTextColor });
  const payloadApi = payloadApiOf({
    adminOrigin: sessionOptions.adminOrigin,
    payloadApi: namedPayloadApi,
  });
  const pageStore = createPageStore();
  pageStore.attach(window);
  const session = () => sessionOf({ available: true, ...sessionOptions }, pageStore.read());
  const adminOrigin = () => session().adminOrigin;
  const scope: OverlayScope = { locale, savedShapes: savedShapesWithin(null) };

  const renderSources = session().isInstantPreviewOn
    ? listenToRenderSources({ adminOrigin, payloadApi, rendersOnThePage: optimistic })
    : null;
  const stopLiveRichTexts =
    renderSources &&
    startLiveRichTextElements(root, scope, adminOrigin, renderSources, {
      render: renderRichText ?? renderSources.htmlOfPayload,
      renderValue: renderRichTextValue,
    });

  const overlay = startSessionOverlay(root, () => scope, session);
  const toggle = showsToggle ? startSessionToggle(document, session, pageStore.setMode) : null;
  const followSession = () => {
    overlay.sync();
    toggle?.sync();
  };

  const stopFollowing = pageStore.subscribe(followSession);
  const stopListeningToSaves =
    onSave && session().available ? listenToSaves(adminOrigin, () => onSave()) : null;

  return {
    destroy() {
      removeAccent();
      stopFollowing();
      stopListeningToSaves?.();
      stopLiveRichTexts?.();
      renderSources?.stop();
      overlay.dispose();
      toggle?.dispose();
    },
  };
}
