import type { PlainObject } from "./plainObject.js";
import type {
  VeEditedField,
  VeMediaOption,
  VeMediaOptions,
  VePickedMedia,
  VeShownMedia,
} from "./protocol.js";

import { readEditedField } from "./fieldEdit.js";
import { isPlainObject } from "./plainObject.js";
import { idOf } from "./veDocument.js";

export const DEFAULT_IMAGE_DESCRIPTION_FIELD = "alt";

const DESCRIPTION_KEY = "alt";

const DESCRIPTION_FIELD_TYPES: ReadonlySet<string> = new Set(["text", "textarea"]);

type FieldOfMedia = {
  name?: string;
  type?: string;
  fields?: readonly FieldOfMedia[];
  tabs?: readonly FieldOfMedia[];
};

const holdsDescription = (fields: readonly FieldOfMedia[], descriptionField: string): boolean =>
  fields.some(({ fields: inside = [], name, tabs = [], type = "" }) =>
    name === undefined
      ? holdsDescription([...inside, ...tabs], descriptionField)
      : name === descriptionField && DESCRIPTION_FIELD_TYPES.has(type)
  );

export const descriptionFieldOf = (
  fields: readonly FieldOfMedia[],
  descriptionField: string
): string | null => (holdsDescription(fields, descriptionField) ? descriptionField : null);

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

const textOf = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const pickedMediaOf = (
  media: unknown,
  descriptionField: string | null
): VePickedMedia | null => {
  const shown = shownMediaOf(media);
  if (!shown || !isPlainObject(media)) return null;
  const id = idOf(media.id);
  const filename = textOf(media.filename);
  const alt = descriptionField === null ? undefined : textOf(media[descriptionField]);
  return {
    ...shown,
    ...(id !== null && { id }),
    ...(filename !== undefined && { filename }),
    ...(alt !== undefined && { alt }),
  };
};

const thumbnailUrlOf = ({ thumbnailURL, thumbnailUrl }: PlainObject, url: string): string => {
  if (typeof thumbnailUrl === "string") return thumbnailUrl;
  return typeof thumbnailURL === "string" ? thumbnailURL : url;
};

export const mediaOptionOf = (
  media: unknown,
  descriptionField: string | null
): VeMediaOption | null => {
  const shown = shownMediaOf(media);
  if (!shown || !isPlainObject(media)) return null;
  const { filename } = media;
  const id = idOf(media.id);
  if (id === null) return null;
  const alt = descriptionField === null ? undefined : textOf(media[descriptionField]);
  return {
    ...shown,
    filename: typeof filename === "string" ? filename : "",
    id,
    thumbnailUrl: thumbnailUrlOf(media, shown.url),
    ...(alt !== undefined && { alt }),
  };
};

export const readMediaOptions = (answer: unknown): VeMediaOptions | null => {
  if (!isPlainObject(answer) || typeof answer.collection !== "string") return null;
  const { collection, descriptionField, documents, hasNextPage } = answer;
  if (!Array.isArray(documents)) return null;
  return {
    collection,
    descriptionField: typeof descriptionField === "string" ? descriptionField : null,
    documents: documents.flatMap((media: unknown) => mediaOptionOf(media, DESCRIPTION_KEY) ?? []),
    hasNextPage: hasNextPage === true,
  };
};

export const readPickedMediaAnswer = (data: unknown): VePickedMedia | null =>
  pickedMediaOf(data, DESCRIPTION_KEY);

export const readPickedMedia = (data: unknown): (VeEditedField & VePickedMedia) | null => {
  const field = readEditedField(data);
  const picked = readPickedMediaAnswer(data);
  return field && picked ? { ...field, ...picked } : null;
};
