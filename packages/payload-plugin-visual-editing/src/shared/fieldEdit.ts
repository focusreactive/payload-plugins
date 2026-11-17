import type { VeEdit, VeEditedField, VeFieldEdit, VeRichTextEdit } from "./protocol.js";

import { isPlainObject } from "./plainObject.js";
import { readPostedEditorState } from "./richText/postedEditorState.js";
import { withoutMarker } from "./stegaText.js";
import { isVeDocument, veDocumentOf } from "./veDocument.js";

const MULTILINE_FIELD_TYPE = "textarea";

export const SAVE_REFUSALS = [
  "locked",
  "no-drafts",
  "not-editable",
  "signed-out",
  "unreadable",
  "failed",
] as const;

export type SaveRefusal = (typeof SAVE_REFUSALS)[number];

export const SAVE_FAILED: SaveRefusal = "failed";

export const REQUEST_UNREADABLE: SaveRefusal = "unreadable";

export const readSaveRefusal = (answer: unknown): SaveRefusal => {
  const reason = isPlainObject(answer) ? answer.reason : undefined;
  return SAVE_REFUSALS.find((refusal) => refusal === reason) ?? SAVE_FAILED;
};

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

export const readRichTextEdit = (data: unknown): VeRichTextEdit | null => {
  const field = readEditedField(data);
  const state = isPlainObject(data) ? readPostedEditorState(data.state) : null;
  return field && state ? { ...field, state } : null;
};

export const isRichTextEdit = (edit: VeEdit): edit is VeRichTextEdit => "state" in edit;
