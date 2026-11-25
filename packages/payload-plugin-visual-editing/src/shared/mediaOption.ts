import type { PlainObject } from "./plainObject.js";
import type { VeEditedField, VeMediaOption, VeMediaOptions, VeShownMedia } from "./protocol.js";

import { readEditedField } from "./fieldEdit.js";
import { isPlainObject } from "./plainObject.js";
import { idOf } from "./veDocument.js";

const sizeOf = (size: unknown): number | undefined => (typeof size === "number" ? size : undefined);

export const shownMediaOf = (media: unknown): VeShownMedia | null => {
  if (!isPlainObject(media) || typeof media.url !== "string") return null;
  const width = sizeOf(media.width);
  const height = sizeOf(media.height);
  return {
    url: media.url,
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
  };
};

const thumbnailUrlOf = ({ thumbnailURL, thumbnailUrl }: PlainObject, url: string): string => {
  if (typeof thumbnailUrl === "string") return thumbnailUrl;
  return typeof thumbnailURL === "string" ? thumbnailURL : url;
};

export const mediaOptionOf = (media: unknown, hasDescription: boolean): VeMediaOption | null => {
  const shown = shownMediaOf(media);
  if (!shown || !isPlainObject(media)) return null;
  const { alt, filename } = media;
  const id = idOf(media.id);
  if (id === null) return null;
  return {
    ...shown,
    filename: typeof filename === "string" ? filename : "",
    id,
    thumbnailUrl: thumbnailUrlOf(media, shown.url),
    ...(hasDescription && typeof alt === "string" && { alt }),
  };
};

export const readMediaOptions = (answer: unknown): VeMediaOptions | null => {
  if (!isPlainObject(answer) || typeof answer.collection !== "string") return null;
  const { collection, documents, hasNextPage } = answer;
  if (!Array.isArray(documents)) return null;
  return {
    collection,
    documents: documents.flatMap((media: unknown) => mediaOptionOf(media, true) ?? []),
    hasNextPage: hasNextPage === true,
  };
};

export const readPickedMedia = (data: unknown): (VeEditedField & VeShownMedia) | null => {
  const field = readEditedField(data);
  const shown = shownMediaOf(data);
  return field && shown ? { ...field, ...shown } : null;
};
