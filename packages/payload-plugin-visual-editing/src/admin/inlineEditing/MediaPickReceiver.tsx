"use client";

import { useConfig, useDocumentInfo, useForm, useListDrawer, useLocale } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  VeEditedField,
  VeFieldEditRefusedMessage,
  VeMediaPickCancelledMessage,
  VeMediaPickedMessage,
} from "../../shared/protocol.js";
import type { MediaPick } from "./mediaPick.js";

import { shownMediaOf } from "../../shared/mediaOption.js";
import { isMessageFrom } from "../../shared/messageSource.js";
import {
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_MEDIA_PICK_CANCELLED_TYPE,
  VE_MEDIA_PICKED_TYPE,
} from "../../shared/protocol.js";
import { idOf } from "../../shared/veDocument.js";
import { useEditableSchema } from "../instantPreview/useEditableSchema.js";
import { usePreviewWindow } from "../instantPreview/usePreviewWindow.js";
import { openDocumentOf } from "../openField/openDocument.js";
import { fetchPickedMedia, mediaPickOf, pickOfDocument } from "./mediaPick.js";

type AskedPick = MediaPick & { request: number };

type MediaDrawerProps = {
  collection: string;
  onClosed: () => void;
  onDismissed: () => void;
  onPicked: (media: unknown) => void;
};

function MediaDrawer({ collection, onClosed, onDismissed, onPicked }: MediaDrawerProps) {
  const [ListDrawer, , { closeDrawer, isDrawerOpen, openDrawer }] = useListDrawer({
    collectionSlugs: [collection],
    selectedCollection: collection,
  });
  const hasBeenOpen = useRef(false);
  const hasPicked = useRef(false);

  useEffect(() => {
    if (isDrawerOpen) {
      hasBeenOpen.current = true;
    } else if (hasBeenOpen.current) {
      if (!hasPicked.current) onDismissed();
      onClosed();
    } else {
      openDrawer();
    }
  }, [isDrawerOpen, onClosed, onDismissed, openDrawer]);

  return (
    <ListDrawer
      allowCreate
      enableRowSelections={false}
      onSelect={({ doc }) => {
        hasPicked.current = true;
        onPicked(doc);
        closeDrawer();
      }}
    />
  );
}

export function MediaPickReceiver({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  const { disabled: isFormDisabled, dispatchFields, getFields, setModified } = useForm();
  const { id, collectionSlug, globalSlug } = useDocumentInfo();
  const editableSchema = useEditableSchema({ collectionSlug, globalSlug }, excludeFieldNames);
  const { code: locale } = useLocale();
  const { getWindow, origin } = usePreviewWindow();
  const { config } = useConfig();
  const apiUrl = `${config.serverURL}${config.routes.api}`;
  const [asked, setAsked] = useState<AskedPick | null>(null);
  const isDrawerOpen = asked !== null;
  const requests = useRef(0);

  useEffect(() => {
    const document = openDocumentOf({ collectionSlug, globalSlug, id });
    if (!document || !origin) return;

    const openDrawerForPick = (event: MessageEvent) => {
      if (!isMessageFrom(event, origin, getWindow())) return;
      const openDocument = { ...document, locale };
      const field = pickOfDocument(event.data, openDocument);
      if (!field) return;
      const pick =
        isFormDisabled || isDrawerOpen
          ? null
          : mediaPickOf(field, { document: openDocument, editableSchema, formState: getFields() });
      if (!pick) {
        const message: VeFieldEditRefusedMessage = { ...field, type: VE_FIELD_EDIT_REFUSED_TYPE };
        getWindow()?.postMessage(message, origin);
        return;
      }
      requests.current += 1;
      setAsked({ ...pick, request: requests.current });
    };

    window.addEventListener("message", openDrawerForPick);
    return () => window.removeEventListener("message", openDrawerForPick);
  }, [
    collectionSlug,
    editableSchema,
    getFields,
    getWindow,
    globalSlug,
    id,
    isDrawerOpen,
    isFormDisabled,
    locale,
    origin,
  ]);

  const forgetPick = useCallback(() => setAsked(null), []);

  const tellPickCancelled = useCallback(
    (field: VeEditedField) => {
      if (!origin) return;
      const message: VeMediaPickCancelledMessage = { ...field, type: VE_MEDIA_PICK_CANCELLED_TYPE };
      getWindow()?.postMessage(message, origin);
    },
    [getWindow, origin]
  );

  const takePicked = useCallback(
    async ({ collection, field, path }: MediaPick, listed: unknown) => {
      const mediaId = idOf((listed as { id?: unknown } | null)?.id);
      if (mediaId === null || !origin) return;
      dispatchFields({ path, type: "UPDATE", value: mediaId });
      setModified(true);
      const media = (await fetchPickedMedia(apiUrl, collection, mediaId)) ?? listed;
      const shown = shownMediaOf(media);
      if (!shown) {
        tellPickCancelled(field);
        return;
      }
      const message: VeMediaPickedMessage = { ...field, ...shown, type: VE_MEDIA_PICKED_TYPE };
      getWindow()?.postMessage(message, origin);
    },
    [apiUrl, dispatchFields, getWindow, origin, setModified, tellPickCancelled]
  );

  if (!asked) return null;
  return (
    <MediaDrawer
      collection={asked.collection}
      key={asked.request}
      onClosed={forgetPick}
      onDismissed={() => tellPickCancelled(asked.field)}
      onPicked={(media) => void takePicked(asked, media)}
    />
  );
}
