"use client";

import type { DocumentEvent } from "payload";

import { useDocumentEvents, useLocale } from "@payloadcms/ui";
import { useContext, useEffect, useRef } from "react";

import type { VeDocument, VeDocumentSavedMessage } from "../shared/protocol.js";

import { VE_DOCUMENT_SAVED_TYPE } from "../shared/protocol.js";
import { collectionDocumentOf } from "../shared/veDocument.js";
import { usePreviewWindow } from "./instantPreview/usePreviewWindow.js";
import { PreviewPagesContext } from "./previewPages.js";

const savedDocumentOf = ({ entitySlug, id }: DocumentEvent): VeDocument =>
  id === undefined || id === null
    ? { collectionSlug: entitySlug, kind: "global" }
    : collectionDocumentOf(entitySlug, id);

const savedMessageOf = (
  saved: DocumentEvent,
  locale: string | undefined
): VeDocumentSavedMessage => ({
  ...savedDocumentOf(saved),
  ...(locale && { locale }),
  type: VE_DOCUMENT_SAVED_TYPE,
});

export function PreviewPageBridge() {
  const { getWindow, origin, post } = usePreviewWindow();
  const { mostRecentUpdate } = useDocumentEvents();
  const { code: locale } = useLocale();
  const announcePreviewPage = useContext(PreviewPagesContext);
  const reportedUpdate = useRef(mostRecentUpdate);

  useEffect(() => {
    if (!origin) return;
    return announcePreviewPage({ getWindow, origin });
  }, [announcePreviewPage, getWindow, origin]);

  useEffect(() => {
    if (mostRecentUpdate === reportedUpdate.current) return;
    reportedUpdate.current = mostRecentUpdate;
    if (mostRecentUpdate) post([savedMessageOf(mostRecentUpdate, locale)]);
  }, [locale, mostRecentUpdate, post]);

  return null;
}
