"use client";

import { useConfig } from "@payloadcms/ui";

import { payloadMediaApi } from "../../shared/mediaApi.js";
import { answerMediaLibraryRequest, mediaLibraryRequestOf } from "./mediaLibraryRequest.js";
import { useOpenDocumentForm } from "./useOpenDocumentForm.js";

export function MediaLibraryReceiver({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  const { config } = useConfig();
  const apiUrl = `${config.serverURL}${config.routes.api}`;

  useOpenDocumentForm(excludeFieldNames, (message, document, form) => {
    const request = mediaLibraryRequestOf(message, document);
    if (!request) return;
    void answerMediaLibraryRequest(
      request,
      form,
      payloadMediaApi(() => apiUrl)
    );
  });

  return null;
}
