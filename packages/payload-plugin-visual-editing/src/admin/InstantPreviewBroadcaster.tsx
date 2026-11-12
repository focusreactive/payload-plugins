"use client";

import { useAllFormFields, useDocumentInfo, useLocale } from "@payloadcms/ui";
import { useLayoutEffect, useMemo, useState } from "react";

import type { AdminState } from "./instantPreview/previewSession.js";

import { createPreviewSession } from "./instantPreview/previewSession.js";
import { useEditableSchema } from "./instantPreview/useEditableSchema.js";
import { usePreviewPage } from "./instantPreview/usePreviewPage.js";
import { usePreviewWindow } from "./instantPreview/usePreviewWindow.js";
import { openDocumentOf } from "./openField/openDocument.js";

export function InstantPreviewBroadcaster({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  const [formState] = useAllFormFields();
  const { id, collectionSlug, globalSlug, data: savedDocument } = useDocumentInfo();
  const editableSchema = useEditableSchema({ collectionSlug, globalSlug }, excludeFieldNames);
  const { code: locale } = useLocale();
  const preview = usePreviewWindow();
  const { getWindow: getPreviewWindow, post: postToPreview } = preview;
  const [session] = useState(createPreviewSession);

  const admin = useMemo((): AdminState | null => {
    const document = openDocumentOf({ collectionSlug, globalSlug, id });
    if (!document) return null;
    return { document: { ...document, locale }, editableSchema, formState, savedDocument };
  }, [collectionSlug, editableSchema, formState, globalSlug, id, locale, savedDocument]);

  usePreviewPage(preview, session);

  useLayoutEffect(() => {
    session.localeChanged(locale);
  }, [locale, session]);

  useLayoutEffect(() => {
    if (!getPreviewWindow()) session.pageLeft();
    postToPreview(session.formChanged(admin));
  }, [admin, getPreviewWindow, postToPreview, session]);

  return null;
}
