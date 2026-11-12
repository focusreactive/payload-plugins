"use client";

import { useContext, useRef, useState } from "react";

import { createSavedRichTextShapes } from "./instantPreview/unsavedRender/savedShapes.js";
import { OverlayLocaleContext, SavedRichTextShapesContext } from "./overlayContext.js";
import { useVisualEditingOverlay } from "./useVisualEditingOverlay.js";
import { useVisualEditing } from "./VisualEditingProvider.js";

export function VisualEditingOverlay({
  locale,
  children,
}: {
  locale?: string;
  children: React.ReactNode;
}) {
  const {
    available,
    enabled,
    instantPreview,
    mode,
    buildAdminEditUrl,
    adminOrigin,
    adminBasePath,
  } = useVisualEditing();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const outerSavedShapes = useContext(SavedRichTextShapesContext);
  const [savedRichTextShapes] = useState(() => outerSavedShapes ?? createSavedRichTextShapes());
  const isInstantPreviewOn = available && instantPreview;
  useVisualEditingOverlay(enabled || isInstantPreviewOn, rootRef, {
    buildAdminEditUrl,
    adminOrigin,
    adminBasePath,
    locale,
    mode: enabled ? mode : "off",
    instantPreview: isInstantPreviewOn,
    keepsRichTextShape: savedRichTextShapes.keeps,
  });
  return (
    <OverlayLocaleContext.Provider value={locale}>
      <SavedRichTextShapesContext.Provider value={savedRichTextShapes}>
        <div ref={rootRef} data-ve-root="" style={{ display: "contents" }}>
          {children}
        </div>
      </SavedRichTextShapesContext.Provider>
    </OverlayLocaleContext.Provider>
  );
}
