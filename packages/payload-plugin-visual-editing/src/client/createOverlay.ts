import type { VisualEditingMode } from "./visualEditingMode.js";
import type { BuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import type { RichTextEditorLoader } from "./inlineEditing/richTextEditor.js";
import type { KeepsShape } from "./instantPreview/liveFields.js";
import type { ImageSrc } from "./inlineEditing/shownImage.js";

import { createEditTargets } from "./overlay/editTargets.js";
import { createFieldTracker } from "./overlay/fieldTracker.js";
import { cleanHeadOutside } from "./overlay/markerCleaner.js";
import { createInlineEditing } from "./inlineEditing/inlineEditing.js";
import { createInstantPreview } from "./instantPreview/instantPreview.js";

export type OverlayCtx = {
  buildAdminEditUrl: BuildAdminEditUrl;
  adminOrigin: string;
  adminBasePath: string;
  locale?: string;
  mode: VisualEditingMode;
  instantPreview?: boolean;
  inlineEditing?: boolean;
  payloadApi?: string;
  keepsRichTextShape?: KeepsShape;
  onEdited?: () => void;
  richTextEditor?: RichTextEditorLoader;
  imageSrc?: ImageSrc;
};

export interface Overlay {
  applyMode(): void;
  dispose(): void;
}

export function createOverlay(main: HTMLElement, getCtx: () => OverlayCtx): Overlay {
  const cleanedHead = cleanHeadOutside(main);
  const tracker = createFieldTracker(main);
  const instantPreview = getCtx().instantPreview ? createInstantPreview(tracker, getCtx) : null;
  const inlineEditing = createInlineEditing(
    tracker,
    () => {
      const {
        adminOrigin,
        imageSrc,
        inlineEditing: isOn = false,
        locale,
        onEdited,
        payloadApi = "",
        richTextEditor,
      } = getCtx();
      return {
        adminOrigin,
        imageSrc,
        inlineEditing: isOn,
        locale,
        onEdited,
        payloadApi,
        richTextEditor,
      };
    },
    instantPreview
  );

  let appliedMode: VisualEditingMode = "off";
  let removeEditTargets: (() => void) | null = null;

  const applyMode = () => {
    const { mode } = getCtx();
    inlineEditing.sync();
    if (mode === appliedMode) return;
    appliedMode = mode;
    removeEditTargets?.();
    removeEditTargets =
      mode === "off"
        ? null
        : createEditTargets(main, tracker, () => ({
            ...getCtx(),
            actionOf: inlineEditing.actionOf,
            editInPlace: inlineEditing.editInPlace,
            mode,
          }));
  };
  applyMode();

  return {
    applyMode,
    dispose() {
      removeEditTargets?.();
      inlineEditing.dispose();
      instantPreview?.stop();
      tracker.dispose();
      cleanedHead.dispose();
    },
  };
}
