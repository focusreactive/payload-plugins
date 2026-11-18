import type { VisualEditingMode } from "./visualEditingMode.js";
import type { BuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import type { KeepsShape } from "./instantPreview/liveFields.js";

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
      const { adminOrigin, inlineEditing: isOn = false, locale, payloadApi = "" } = getCtx();
      return { adminOrigin, inlineEditing: isOn, locale, payloadApi };
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
