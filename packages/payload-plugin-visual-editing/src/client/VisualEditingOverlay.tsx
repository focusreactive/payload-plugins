"use client";

import { useContext, useMemo, useRef, useState } from "react";

import type { OverlayScope } from "./overlayScope.js";

import { OverlayScopeContext } from "./overlayContext.js";
import { savedShapesWithin } from "./overlayScope.js";
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
  const outerScope = useContext(OverlayScopeContext);
  const [savedShapes] = useState(() => savedShapesWithin(outerScope));
  const scope = useMemo((): OverlayScope => ({ locale, savedShapes }), [locale, savedShapes]);
  const isInstantPreviewOn = available && instantPreview;
  useVisualEditingOverlay(enabled || isInstantPreviewOn, rootRef, scope, {
    buildAdminEditUrl,
    adminOrigin,
    adminBasePath,
    mode: enabled ? mode : "off",
    instantPreview: isInstantPreviewOn,
  });
  return (
    <OverlayScopeContext.Provider value={scope}>
      <div ref={rootRef} data-ve-root="" style={{ display: "contents" }}>
        {children}
      </div>
    </OverlayScopeContext.Provider>
  );
}
