"use client";

import { useContext, useEffect } from "react";

import { PreviewPagesContext } from "./previewPages.js";
import { usePreviewWindow } from "./instantPreview/usePreviewWindow.js";

export function PreviewPageAnnouncer() {
  const { getWindow, origin } = usePreviewWindow();
  const announcePreviewPage = useContext(PreviewPagesContext);

  useEffect(() => {
    if (!origin) return;
    return announcePreviewPage({ getWindow, origin });
  }, [announcePreviewPage, getWindow, origin]);

  return null;
}
