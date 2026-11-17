import type { VeFieldEdit } from "./protocol.js";

import { isPlainObject } from "./plainObject.js";
import { withoutMarker } from "./stegaText.js";
import { isVeDocument, veDocumentOf } from "./veDocument.js";

const MULTILINE_FIELD_TYPE = "textarea";

const LINE_BREAKS = /\s*[\n\r]+\s*/gu;

export const editedTextOf = (fieldType: string, value: string): string => {
  const text = withoutMarker(value);
  return fieldType === MULTILINE_FIELD_TYPE ? text : text.replaceAll(LINE_BREAKS, " ");
};

export const readFieldEdit = (data: unknown): VeFieldEdit | null => {
  if (!isPlainObject(data) || !isVeDocument(data)) return null;
  const { key, locale, value } = data;
  if (typeof key !== "string" || typeof value !== "string") return null;
  if (locale !== undefined && typeof locale !== "string") return null;
  return { ...veDocumentOf(data), key, value, ...(locale !== undefined && { locale }) };
};
