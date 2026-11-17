"use client";

import { useDocumentEvents } from "@payloadcms/ui";
import { useContext, useEffect, useRef } from "react";

import type { VeDocumentSavedMessage } from "../shared/protocol.js";

import { VE_DOCUMENT_SAVED_TYPE } from "../shared/protocol.js";
import { usePreviewWindow } from "./instantPreview/usePreviewWindow.js";
import { PreviewPagesContext } from "./previewPages.js";

const DOCUMENT_SAVED: VeDocumentSavedMessage = { type: VE_DOCUMENT_SAVED_TYPE };

export function PreviewPageBridge() {
  const { getWindow, origin, post } = usePreviewWindow();
  const { mostRecentUpdate } = useDocumentEvents();
  const announcePreviewPage = useContext(PreviewPagesContext);
  const reportedUpdate = useRef(mostRecentUpdate);

  useEffect(() => {
    if (!origin) return;
    return announcePreviewPage({ getWindow, origin });
  }, [announcePreviewPage, getWindow, origin]);

  useEffect(() => {
    if (mostRecentUpdate === reportedUpdate.current) return;
    reportedUpdate.current = mostRecentUpdate;
    post([DOCUMENT_SAVED]);
  }, [mostRecentUpdate, post]);

  return null;
}
