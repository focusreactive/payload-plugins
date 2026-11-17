"use client";

import { useAllFormFields, useConfig, useDocumentInfo, useLocale } from "@payloadcms/ui";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { GrantedPage } from "./instantPreview/previewGrants.js";
import type { AdminState } from "./instantPreview/previewSession.js";

import {
  createPreviewGrants,
  fetchGrantFrom,
  GRANT_RENEWAL_INTERVAL_MS,
} from "./instantPreview/previewGrants.js";
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
  const { config } = useConfig();
  const [grants] = useState(() =>
    createPreviewGrants(fetchGrantFrom(`${config.serverURL}${config.routes.api}`))
  );
  const latestPageId = useRef<string | null>(null);
  const openDocument = useMemo(
    () => openDocumentOf({ collectionSlug, globalSlug, id }),
    [collectionSlug, globalSlug, id]
  );

  const postGrantToPage = useCallback(
    (page: GrantedPage) => {
      if (!openDocument) return;
      latestPageId.current = page.pageId;
      const sendGrant = async () => {
        const message = await grants.forPage(openDocument, page);
        if (message) postToPreview([message]);
      };
      void sendGrant();
    },
    [grants, openDocument, postToPreview]
  );

  const admin = useMemo((): AdminState | null => {
    const document = openDocumentOf({ collectionSlug, globalSlug, id });
    if (!document) return null;
    return { document: { ...document, locale }, editableSchema, formState, savedDocument };
  }, [collectionSlug, editableSchema, formState, globalSlug, id, locale, savedDocument]);

  usePreviewPage(preview, session, postGrantToPage);

  useEffect(() => {
    const postRenewedGrant = () => {
      const pageId = latestPageId.current;
      if (pageId !== null) postGrantToPage({ asksForGrant: false, pageId });
    };
    const timer = setInterval(postRenewedGrant, GRANT_RENEWAL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [postGrantToPage]);

  useLayoutEffect(() => {
    session.localeChanged(locale);
  }, [locale, session]);

  useLayoutEffect(() => {
    if (!getPreviewWindow()) session.pageLeft();
    postToPreview(session.formChanged(admin));
  }, [admin, getPreviewWindow, postToPreview, session]);

  return null;
}
