import type {
  VeDocument,
  VeEditedField,
  VeFieldEdit,
  VeMediaOption,
  VePickMediaMessage,
  VeShownMedia,
} from "../../shared/protocol.js";
import type { BadgeAction } from "../overlay/editBadge.js";
import type { FieldTracker } from "../overlay/fieldTracker.js";
import type { EditStatus } from "./editTransport.js";

import { readEditedField } from "../../shared/fieldEdit.js";
import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { readPickedMedia } from "../../shared/mediaOption.js";
import { isMessageFrom } from "../../shared/messageSource.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  DATA_VE_LIVE_RICH_TEXT_ATTR,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_MEDIA_PICKED_TYPE,
  VE_PICK_MEDIA_TYPE,
} from "../../shared/protocol.js";
import { keyedFieldAddressOf, veDocumentOf } from "../../shared/veDocument.js";
import { adminOriginOf, findAdminWindow } from "../adminWindow.js";
import { readMarkerFromAttrs } from "../overlay/markerExtractor.js";
import { createMediaLibrary } from "./mediaLibrary.js";
import { createMediaPicker } from "./mediaPicker.js";
import { absoluteUrlOf, showMedia } from "./shownImage.js";

export type ImageReplacementCtx = {
  adminOrigin: string;
  payloadApi: string;
  locale?: string;
  inlineEditing: boolean;
};

export type ImageReplacementOptions = {
  tracker: FieldTracker;
  getCtx: () => ImageReplacementCtx;
  holdsFormOf: ((document: VeDocument) => boolean) | null;
  save: (edit: VeFieldEdit) => void;
  showStatus: (status: EditStatus) => void;
};

export interface ImageReplacement {
  actionOf(target: HTMLElement): BadgeAction | null;
  retry(): void;
  dispose(): void;
}

export const REPLACE_IMAGE_LABEL = "Replace image";

type ReplaceableImage = { field: VeEditedField; image: HTMLImageElement };

const IMAGES = "img";

const addressOf = (field: VeEditedField): string =>
  JSON.stringify([keyedFieldAddressOf(field), field.locale ?? null]);

const onlyImageOf = (target: HTMLElement): HTMLImageElement | null => {
  if (target instanceof HTMLImageElement) return target;
  const images = target.querySelectorAll<HTMLImageElement>(IMAGES);
  return images.length === 1 ? (images[0] ?? null) : null;
};

export function createImageReplacement({
  getCtx,
  holdsFormOf,
  save,
  showStatus,
  tracker,
}: ImageReplacementOptions): ImageReplacement {
  const trackedTexts = new Set<Text>();
  const askedOfAdmin = new Map<string, ReplaceableImage>();
  const refusedByAdmin = new Map<string, ReplaceableImage>();
  const urlOf = (url: string) => absoluteUrlOf(url, getCtx().payloadApi);
  const picker = createMediaPicker(
    document,
    createMediaLibrary(() => getCtx().payloadApi),
    urlOf
  );

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
    const key = marker && fieldKeyOfMarker(marker);
    if (!marker || !key || marker.locale !== undefined) return null;
    if (!tracker.isIdentifiedByThePage(target)) return null;
    if (target.hasAttribute(DATA_VE_LIVE_RICH_TEXT_ATTR)) return null;
    const image = onlyImageOf(target);
    if (!image || showsTrackedText(target)) return null;
    const { locale } = getCtx();
    return {
      field: { ...veDocumentOf(marker), key, ...(locale !== undefined && { locale }) },
      image,
    };
  };

  const show = ({ image }: ReplaceableImage, media: VeShownMedia) => {
    if (image.isConnected) showMedia(image, media, urlOf(media.url));
  };

  const askAdmin = (adminWindow: Window, replaceable: ReplaceableImage) => {
    const address = addressOf(replaceable.field);
    const message: VePickMediaMessage = { ...replaceable.field, type: VE_PICK_MEDIA_TYPE };
    refusedByAdmin.delete(address);
    askedOfAdmin.set(address, replaceable);
    adminWindow.postMessage(message, adminOriginOf(getCtx().adminOrigin));
  };

  const saveThroughEndpoint = (replaceable: ReplaceableImage, media: VeMediaOption) => {
    show(replaceable, media);
    save({ ...replaceable.field, value: String(media.id) });
  };

  const replace = (replaceable: ReplaceableImage) => {
    const adminWindow = findAdminWindow(window);
    if (adminWindow) askAdmin(adminWindow, replaceable);
    else picker.open(replaceable.field, (media) => saveThroughEndpoint(replaceable, media));
  };

  const isOffered = ({ field }: ReplaceableImage): boolean => {
    if (!getCtx().inlineEditing) return false;
    if (!findAdminWindow(window)) return true;
    return holdsFormOf?.(veDocumentOf(field)) ?? false;
  };

  const showPickedMedia = (data: unknown) => {
    const picked = readPickedMedia(data);
    const asked = picked && askedOfAdmin.get(addressOf(picked));
    if (!picked || !asked) return;
    askedOfAdmin.delete(addressOf(picked));
    show(asked, picked);
    showStatus("unsaved");
  };

  const rememberRefusedPick = (data: unknown) => {
    const refused = readEditedField(data);
    const asked = refused && askedOfAdmin.get(addressOf(refused));
    if (!refused || !asked) return;
    askedOfAdmin.delete(addressOf(refused));
    refusedByAdmin.set(addressOf(refused), asked);
    showStatus("failed");
  };

  const hearAdmin = (event: MessageEvent) => {
    const { adminOrigin } = getCtx();
    if (!isMessageFrom(event, adminOriginOf(adminOrigin), findAdminWindow(window))) return;
    const { data } = event;
    if (!isPlainObject(data)) return;
    if (data.type === VE_MEDIA_PICKED_TYPE) showPickedMedia(data);
    if (data.type === VE_FIELD_EDIT_REFUSED_TYPE) rememberRefusedPick(data);
  };
  window.addEventListener("message", hearAdmin);

  return {
    actionOf(target) {
      const replaceable = replaceableImageOf(target);
      if (!replaceable || !isOffered(replaceable)) return null;
      return { label: REPLACE_IMAGE_LABEL, run: () => replace(replaceable) };
    },
    dispose() {
      window.removeEventListener("message", hearAdmin);
      stopTracking();
      picker.remove();
    },
    retry() {
      const adminWindow = findAdminWindow(window);
      const refused = [...refusedByAdmin.values()];
      refusedByAdmin.clear();
      if (!adminWindow) return;
      for (const replaceable of refused) askAdmin(adminWindow, replaceable);
    },
  };
}
