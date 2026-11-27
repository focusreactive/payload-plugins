import type { AccentOptions } from "../client/accent.js";
import type { RichTextEditorLoader } from "../client/inlineEditing/richTextEditor.js";
import type { ImageSrc } from "../client/inlineEditing/shownImage.js";
import type { OverlayScope } from "../client/overlayScope.js";
import type { SessionOptions } from "../client/session.js";
import type { RenderRichTextHtml, RenderRichTextValue } from "./liveRichTextElements.js";

import { applyAccent } from "../client/accent.js";
import { hearNothing } from "../client/frameSettings.js";
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
    onEdited?: () => void;
    richTextEditor?: RichTextEditorLoader;
    imageSrc?: ImageSrc;
  };

export interface VisualEditing {
  destroy(): void;
}

interface RunWhile {
  sync(): void;
  stop(): void;
}

function runWhile(shouldRun: () => boolean, start: () => () => void): RunWhile {
  let stopRunning: (() => void) | null = null;
  const stop = () => {
    stopRunning?.();
    stopRunning = null;
  };
  return {
    sync() {
      const runs = shouldRun();
      if (runs && !stopRunning) stopRunning = start();
      if (!runs) stop();
    },
    stop,
  };
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
  onEdited,
  richTextEditor,
  imageSrc,
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
  const session = () =>
    sessionOf(
      { available: true, ...sessionOptions, payloadApi: namedPayloadApi },
      pageStore.read()
    );
  const adminOrigin = () => session().adminOrigin;
  pageStore.attach(window);
  const stopHearingTheFrame = session().isDraft
    ? pageStore.hearItsFrame(window, adminOrigin)
    : hearNothing;
  const scope: OverlayScope = { locale, savedShapes: savedShapesWithin(null) };

  const instantPreview = runWhile(
    () => session().isInstantPreviewOn,
    () => {
      const renderSources = listenToRenderSources({
        adminOrigin,
        payloadApi,
        rendersOnThePage: optimistic,
      });
      const stopLiveRichTexts = startLiveRichTextElements(root, scope, adminOrigin, renderSources, {
        render: renderRichText ?? renderSources.htmlOfPayload,
        renderValue: renderRichTextValue,
      });
      return () => {
        stopLiveRichTexts();
        renderSources.stop();
      };
    }
  );
  const saves = runWhile(
    () => Boolean(onSave) && session().available,
    () => listenToSaves(adminOrigin, () => onSave?.())
  );

  const pageEditing = { imageSrc, onEdited, richTextEditor };
  const overlay = startSessionOverlay(
    root,
    () => scope,
    session,
    () => pageEditing
  );
  const toggle = showsToggle ? startSessionToggle(document, session, pageStore.setMode) : null;
  const followSession = () => {
    instantPreview.sync();
    saves.sync();
    overlay.sync();
    toggle?.sync();
  };

  const stopFollowing = pageStore.subscribe(followSession);
  instantPreview.sync();
  saves.sync();

  return {
    destroy() {
      removeAccent();
      stopFollowing();
      stopHearingTheFrame();
      saves.stop();
      instantPreview.stop();
      overlay.dispose();
      toggle?.dispose();
    },
  };
}
