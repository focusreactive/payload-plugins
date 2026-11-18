import type { VeEdit, VeEditedField, VeFieldEdit, VeRichTextEdit } from "./protocol.js";

import type { PlainObject } from "./plainObject.js";

import { isPlainObject } from "./plainObject.js";
import { readPostedEditorState } from "./richText/postedEditorState.js";
import { withoutMarker } from "./stegaText.js";
import { isVeDocument, veDocumentOf } from "./veDocument.js";

const MULTILINE_FIELD_TYPE = "textarea";

export const SAVE_REFUSALS = [
  "changed",
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

export const CHANGED_ELSEWHERE: SaveRefusal = "changed";

export const readSaveRefusal = (answer: unknown): SaveRefusal => {
  const reason = isPlainObject(answer) ? answer.reason : undefined;
  return SAVE_REFUSALS.find((refusal) => refusal === reason) ?? SAVE_FAILED;
};

const LINE_BREAK_CHARACTERS = String.raw`\n\r\v\f\u0085\u2028\u2029`;

const LINE_BREAKS = new RegExp(String.raw`\s*[${LINE_BREAK_CHARACTERS}]+\s*`, "gu");

const LINE_BREAK = new RegExp(`[${LINE_BREAK_CHARACTERS}]`, "u");

const JOINED_LINES = " ";

export const holdsLineBreak = (text: string): boolean => LINE_BREAK.test(text);

export const oneLineOf = (text: string): string => text.replaceAll(LINE_BREAKS, JOINED_LINES);

export const editedTextOf = (fieldType: string, value: string): string => {
  const text = withoutMarker(value);
  return fieldType === MULTILINE_FIELD_TYPE ? text : oneLineOf(text);
};

export const readEditedField = (data: unknown): VeEditedField | null => {
  if (!isPlainObject(data) || !isVeDocument(data)) return null;
  const { key, locale } = data;
  if (typeof key !== "string") return null;
  if (locale !== undefined && typeof locale !== "string") return null;
  return { ...veDocumentOf(data), key, ...(locale !== undefined && { locale }) };
};

const STARTING_VALUES = ["base", "sentBefore"] as const;

type StartingValues<Value> = { base?: Value; sentBefore?: Value };

const readStartingValues = <Value>(
  data: PlainObject,
  read: (posted: unknown) => Value | null
): StartingValues<Value> | null => {
  const values: StartingValues<Value> = {};
  for (const name of STARTING_VALUES) {
    if (data[name] === undefined) continue;
    const value = read(data[name]);
    if (value === null) return null;
    values[name] = value;
  }
  return values;
};

const readText = (posted: unknown): string | null => (typeof posted === "string" ? posted : null);

export const readFieldEdit = (data: unknown): VeFieldEdit | null => {
  const field = readEditedField(data);
  if (!field || !isPlainObject(data) || typeof data.value !== "string") return null;
  const startingValues = readStartingValues(data, readText);
  return startingValues && { ...field, ...startingValues, value: data.value };
};

export const readRichTextEdit = (data: unknown): VeRichTextEdit | null => {
  const field = readEditedField(data);
  const state = isPlainObject(data) ? readPostedEditorState(data.state) : null;
  if (!field || !state || !isPlainObject(data)) return null;
  const startingValues = readStartingValues(data, (posted) => readPostedEditorState(posted));
  return startingValues && { ...field, ...startingValues, state };
};

export const isRichTextEdit = (edit: VeEdit): edit is VeRichTextEdit => "state" in edit;
