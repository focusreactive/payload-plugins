"use client";

import { useRef } from "react";

import { useVisualEditingOverlay } from "./useVisualEditingOverlay.js";
import { useVisualEditing } from "./VisualEditingProvider.js";

export function VisualEditingOverlay({
  locale,
  children,
}: {
  locale?: string;
  children: React.ReactNode;
}) {
  const { enabled, mode, buildAdminEditUrl, adminOrigin, adminBasePath } = useVisualEditing();
  const rootRef = useRef<HTMLDivElement | null>(null);
  // The overlay is never mounted in 'off' mode (enabled === false), so 'always'|'hover' is safe here.
  useVisualEditingOverlay(enabled, rootRef, {
    buildAdminEditUrl,
    adminOrigin,
    adminBasePath,
    locale,
    mode: mode === "off" ? "hover" : mode,
  });
  // `display: contents` keeps the wrapper in the DOM tree (so the overlay has a
  // scan root that matches exactly what the caller chose to wrap) without
  // introducing a layout/BFC boundary that could alter the child flow.
  return (
    <div ref={rootRef} data-ve-root="" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
