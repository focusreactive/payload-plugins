"use client";

import { useConfig, useListDrawer } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";

import type { VeEditedField } from "../../shared/protocol.js";
import type { MediaPick } from "./mediaPick.js";
import type { OpenDocumentForm } from "./useOpenDocumentForm.js";

import { NOT_EDITABLE, SAVE_FAILED } from "../../shared/fieldEdit.js";
import {
  DEFAULT_IMAGE_DESCRIPTION_FIELD,
  descriptionFieldOf,
  pickedMediaOf,
} from "../../shared/mediaOption.js";
import { VE_MEDIA_PICK_CANCELLED_TYPE, VE_MEDIA_PICKED_TYPE } from "../../shared/protocol.js";
import { idOf } from "../../shared/veDocument.js";
import { MediaLibraryReceiver } from "./MediaLibraryReceiver.js";
import { chosenMediaOf, fetchPickedMedia, mediaPickOf, pickOfDocument } from "./mediaPick.js";
import { useOpenDocumentForm } from "./useOpenDocumentForm.js";

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

export function MediaPickReceiver({
  excludeFieldNames,
  imageDescriptionField = DEFAULT_IMAGE_DESCRIPTION_FIELD,
}: {
  excludeFieldNames?: string[];
  imageDescriptionField?: string;
}) {
  const { config, getEntityConfig } = useConfig();
  const apiUrl = `${config.serverURL}${config.routes.api}`;
  const [asked, setAsked] = useState<AskedPick | null>(null);
  const requests = useRef(0);

  const forgetPick = useCallback(() => setAsked(null), []);

  const tellPickCancelled = (form: OpenDocumentForm, field: VeEditedField) => {
    form.tell({ ...field, type: VE_MEDIA_PICK_CANCELLED_TYPE });
  };

  const writePicked = (
    form: OpenDocumentForm,
    { collection, field, path }: MediaPick,
    mediaId: number | string,
    media: unknown
  ) => {
    if (!form.isOpen()) return;
    form.write({ path, value: mediaId });
    const describedBy = descriptionFieldOf(
      getEntityConfig({ collectionSlug: collection })?.fields ?? [],
      imageDescriptionField
    );
    const shown = pickedMediaOf(media, describedBy);
    if (!shown) {
      tellPickCancelled(form, field);
      return;
    }
    form.tell({ ...field, ...shown, type: VE_MEDIA_PICKED_TYPE });
  };

  const takePicked = async (form: OpenDocumentForm, pick: MediaPick, listed: unknown) => {
    const mediaId = idOf((listed as { id?: unknown } | null)?.id);
    if (mediaId === null) return;
    const media = await fetchPickedMedia(apiUrl, pick.collection, mediaId);
    writePicked(form, pick, mediaId, media ?? listed);
  };

  const takeChosenOnThePage = async (
    form: OpenDocumentForm,
    pick: MediaPick,
    mediaId: number | string
  ) => {
    const media = await fetchPickedMedia(apiUrl, pick.collection, mediaId);
    if (media === null) form.refuse(pick.field, SAVE_FAILED);
    else writePicked(form, pick, mediaId, media);
  };

  const { form } = useOpenDocumentForm(excludeFieldNames, (message, document, open) => {
    const field = pickOfDocument(message, document);
    if (!field) return;
    if (asked) {
      open.refuse(field, SAVE_FAILED);
      return;
    }
    const pick = open.held((openForm) => mediaPickOf(field, openForm));
    if (!pick) {
      open.refuse(field, NOT_EDITABLE);
      return;
    }
    const chosenOnThePage = chosenMediaOf(message);
    if (chosenOnThePage !== null) {
      void takeChosenOnThePage(open, pick, chosenOnThePage);
      return;
    }
    requests.current += 1;
    setAsked({ ...pick, request: requests.current });
  });

  const cancelOpenPick = useRef<(() => void) | null>(null);
  cancelOpenPick.current = asked && (() => tellPickCancelled(form, asked.field));

  useEffect(() => () => cancelOpenPick.current?.(), []);

  return (
    <>
      <MediaLibraryReceiver excludeFieldNames={excludeFieldNames} />
      {asked && (
        <MediaDrawer
          collection={asked.collection}
          key={asked.request}
          onClosed={forgetPick}
          onDismissed={() => tellPickCancelled(form, asked.field)}
          onPicked={(media) => void takePicked(form, asked, media)}
        />
      )}
    </>
  );
}
