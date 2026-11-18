import type { VeEditedField, VeFieldEdit } from "./protocol.js";

import { isPlainObject } from "./plainObject.js";
import { withoutMarker } from "./stegaText.js";
import { isVeDocument, veDocumentOf } from "./veDocument.js";

const MULTILINE_FIELD_TYPE = "textarea";

const LINE_BREAKS = /\s*[\n\r]+\s*/gu;

export const editedTextOf = (fieldType: string, value: string): string => {
  const text = withoutMarker(value);
  return fieldType === MULTILINE_FIELD_TYPE ? text : text.replaceAll(LINE_BREAKS, " ");
};

export const readEditedField = (data: unknown): VeEditedField | null => {
  if (!isPlainObject(data) || !isVeDocument(data)) return null;
  const { key, locale } = data;
  if (typeof key !== "string") return null;
  if (locale !== undefined && typeof locale !== "string") return null;
  return { ...veDocumentOf(data), key, ...(locale !== undefined && { locale }) };
};

export const readFieldEdit = (data: unknown): VeFieldEdit | null => {
  const field = readEditedField(data);
  const value = isPlainObject(data) ? data.value : undefined;
  return field && typeof value === "string" ? { ...field, value } : null;
};
