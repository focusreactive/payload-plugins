import type { VisualEditingMode } from "./visualEditingMode.js";
import type { BuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import type { KeepsShape } from "./instantPreview/liveFields.js";

import { createEditTargets } from "./overlay/editTargets.js";
import { createFieldTracker } from "./overlay/fieldTracker.js";
import { createInstantPreview } from "./instantPreview/instantPreview.js";

export type OverlayCtx = {
  buildAdminEditUrl: BuildAdminEditUrl;
  adminOrigin: string;
  adminBasePath: string;
  locale?: string;
  mode: VisualEditingMode;
  instantPreview?: boolean;
  keepsRichTextShape?: KeepsShape;
};

export interface Overlay {
  applyMode(): void;
  dispose(): void;
}

export function createOverlay(main: HTMLElement, getCtx: () => OverlayCtx): Overlay {
  const tracker = createFieldTracker(main);
  const stopInstantPreview = getCtx().instantPreview ? createInstantPreview(tracker, getCtx) : null;

  let appliedMode: VisualEditingMode = "off";
  let removeEditTargets: (() => void) | null = null;

  const applyMode = () => {
    const { mode } = getCtx();
    if (mode === appliedMode) return;
    appliedMode = mode;
    removeEditTargets?.();
    removeEditTargets =
      mode === "off" ? null : createEditTargets(main, tracker, () => ({ ...getCtx(), mode }));
  };
  applyMode();

  return {
    applyMode,
    dispose() {
      removeEditTargets?.();
      stopInstantPreview?.();
      tracker.dispose();
    },
  };
}
