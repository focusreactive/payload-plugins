import type { VeEditedField, VeMediaOption, VePickedMedia } from "../../shared/protocol.js";
import type { BadgeAction } from "../overlay/editBadge.js";
import type { FieldTracker } from "../overlay/fieldTracker.js";
import type { ImageEdit, ShownImage } from "./editTransport.js";
import type { MediaApiOf } from "./mediaLibrary.js";
import type { PageFields } from "./pageFields.js";
import type { BuildImageUrl } from "./shownImage.js";

import { DATA_VE_LIVE_RICH_TEXT_ATTR, DATA_VE_VALUE_ID_ATTR } from "../../shared/protocol.js";

import { readMarkerFromAttrs } from "../overlay/markerExtractor.js";
import { createMediaLibrary } from "./mediaLibrary.js";
import { createMediaPicker } from "./mediaPicker.js";
import { isPageField } from "./pageFields.js";
import { absoluteUrlOf, showMedia } from "./shownImage.js";

export type ImageReplacementCtx = {
  payloadApi: string;
  inlineEditing: boolean;
  buildImageUrl?: BuildImageUrl;
};

export type ImageReplacementOptions = {
  tracker: FieldTracker;
  getCtx: () => ImageReplacementCtx;
  pageFields: PageFields;
  isInsideRichText: (target: Element) => boolean;
  mediaApiOf: MediaApiOf;
  beginImageEdit(field: VeEditedField, image: ShownImage): ImageEdit;
};

export interface ImageReplacement {
  actionOf(target: HTMLElement): BadgeAction | null;
  dispose(): void;
}

export const REPLACE_IMAGE_LABEL = "Replace image";

export const THUMBNAIL_SIZE = { width: 320 } as const;

type ReplaceableImage = {
  field: VeEditedField;
  image: HTMLImageElement;
  shownMediaId: string | null;
  isDescribedByTheField: boolean;
};

const IMAGES = "img";

const onlyImageOf = (target: HTMLElement): HTMLImageElement | null => {
  if (target instanceof HTMLImageElement) return target;
  const images = target.querySelectorAll<HTMLImageElement>(IMAGES);
  return images.length === 1 ? (images[0] ?? null) : null;
};

export function createImageReplacement({
  beginImageEdit,
  getCtx,
  isInsideRichText,
  mediaApiOf,
  pageFields,
  tracker,
}: ImageReplacementOptions): ImageReplacement {
  const trackedTexts = new Set<Text>();
  const urlOf = (url: string) => absoluteUrlOf(url, getCtx().payloadApi);
  const thumbnailSrcOf = (media: VeMediaOption) =>
    getCtx().buildImageUrl?.({ ...media, url: media.thumbnailUrl }, THUMBNAIL_SIZE) ??
    urlOf(media.thumbnailUrl);
  const picker = createMediaPicker(document, createMediaLibrary(mediaApiOf), thumbnailSrcOf);

  const stopTracking = tracker.subscribe({
    onFields: (_root, matches) => {
      for (const { textNode } of matches) trackedTexts.add(textNode);
    },
    onNodesReleased: (matches) => {
      for (const { textNode } of matches) trackedTexts.delete(textNode);
    },
  });

  const showsTrackedText = (target: HTMLElement): boolean =>
    [...trackedTexts].some((textNode) => target.contains(textNode));

  const replaceableImageOf = (target: HTMLElement): ReplaceableImage | null => {
    const marker = readMarkerFromAttrs(target);
    const answer = marker && pageFields.editableFieldOf(marker, "image");
    if (!answer || !isPageField(answer)) return null;
    const isDescribedByTheField = tracker.namesUploadOf(target);
    if (!tracker.isIdentifiedByThePage(target) && !isDescribedByTheField) return null;
    if (target.hasAttribute(DATA_VE_LIVE_RICH_TEXT_ATTR) || isInsideRichText(target)) return null;
    const image = onlyImageOf(target);
    if (!image || showsTrackedText(target)) return null;
    return {
      field: answer.field,
      image,
      isDescribedByTheField,
      shownMediaId: target.getAttribute(DATA_VE_VALUE_ID_ATTR),
    };
  };

  const srcOf = (media: VePickedMedia) => getCtx().buildImageUrl?.(media) ?? urlOf(media.url);

  const replace = (
    { field, image, isDescribedByTheField, shownMediaId }: ReplaceableImage,
    openField: () => void
  ) => {
    const edit = beginImageEdit(field, {
      openField,
      show: (media) =>
        image.isConnected ? showMedia(image, media, srcOf(media), isDescribedByTheField) : null,
      shownMediaId,
    });
    if (!edit.pickInTheDrawer()) picker.open(field, edit.use, openField);
  };

  return {
    actionOf(target) {
      const replaceable = replaceableImageOf(target);
      if (!getCtx().inlineEditing || !replaceable) return null;
      return {
        label: REPLACE_IMAGE_LABEL,
        run: (openField) => replace(replaceable, openField),
      };
    },
    dispose() {
      stopTracking();
      picker.remove();
    },
  };
}
