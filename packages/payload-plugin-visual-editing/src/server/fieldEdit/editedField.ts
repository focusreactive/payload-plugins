import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { FieldStep } from "../../shared/fieldKey.js";
import type { PlainObject } from "../../shared/plainObject.js";
import type { VeEditorState } from "../../shared/protocol.js";

import {
  isRichTextAt,
  textFieldTypeAt,
  uploadCollectionAt,
} from "../../shared/editableSchema/editableSchema.js";
import { editedTextOf } from "../../shared/fieldEdit.js";
import { FIELD_PATH_SEPARATOR } from "../../shared/fieldKey.js";
import { isPlainObject } from "../../shared/plainObject.js";
import type { VeRichTextFormats } from "../../shared/richText/formats.js";

import { editedStateOf } from "../../shared/richText/editedState.js";
import { rootOf } from "../../shared/richText/editorNodes.js";
import { isEditorStateTree } from "../../shared/richText/editorStateTree.js";
import { idOf } from "../../shared/veDocument.js";

export type EditedField = { name: string; value: unknown };

type Segment = number | string;

type Walked = { path: readonly Segment[]; steps: readonly FieldStep[]; value: unknown };

const startOf = (document: unknown): Walked => ({ path: [], steps: [], value: document });

const intoRow = ({ path, steps, value }: Walked, rowId: string): Walked | null => {
  const rows = Array.isArray(value) ? value : [];
  const index = rows.findIndex((row) => isPlainObject(row) && String(row.id) === rowId);
  const row: unknown = rows[index];
  if (!isPlainObject(row)) return null;
  const { blockType } = row;
  const step = typeof blockType === "string" ? { blockType, rowId } : { rowId };
  return { path: [...path, index], steps: [...steps, step], value: row };
};

const intoField = ({ path, steps, value }: Walked, name: string): Walked | null => {
  if (!isPlainObject(value)) return null;
  return {
    path: [...path, name],
    steps: [...steps, { name }],
    value: Object.hasOwn(value, name) ? value[name] : undefined,
  };
};

const walkTo = (document: unknown, key: string): Walked | null =>
  key
    .split(FIELD_PATH_SEPARATOR)
    .reduce<Walked | null>(
      (walked, segment) =>
        walked &&
        (Array.isArray(walked.value) ? intoRow(walked, segment) : intoField(walked, segment)),
      startOf(document)
    );

const withValueAt = (holder: unknown, path: readonly Segment[], value: unknown): unknown => {
  const [segment, ...rest] = path;
  if (segment === undefined) return value;
  if (Array.isArray(holder)) {
    return holder.map((item: unknown, index) =>
      index === segment ? withValueAt(item, rest, value) : item
    );
  }
  const fields: PlainObject = isPlainObject(holder) ? holder : {};
  return { ...fields, [segment]: withValueAt(fields[segment], rest, value) };
};

const mayHoldText = (value: unknown): boolean =>
  typeof value === "string" || value === null || value === undefined;

export const showsText = (document: unknown, schema: EditableSchema, key: string): boolean => {
  const walked = walkTo(document, key);
  return (
    walked !== null &&
    typeof walked.value === "string" &&
    textFieldTypeAt(schema, walked.steps) !== null
  );
};

const fieldWith = (document: unknown, { path }: Walked, value: unknown): EditedField | null => {
  const [name, ...rest] = path;
  if (typeof name !== "string" || !isPlainObject(document)) return null;
  return { name, value: withValueAt(document[name], rest, value) };
};

export const editedFieldOf = (
  document: unknown,
  schema: EditableSchema,
  key: string,
  value: string
): EditedField | null => {
  const walked = walkTo(document, key);
  const fieldType = walked && textFieldTypeAt(schema, walked.steps);
  if (!walked || !fieldType || !mayHoldText(walked.value)) return null;
  return fieldWith(document, walked, editedTextOf(fieldType, value));
};

const mayHoldOneDocument = (value: unknown): boolean =>
  idOf(value) !== null || value === null || value === undefined;

export const shownUploadCollectionOf = (
  document: unknown,
  schema: EditableSchema,
  key: string
): string | null => {
  const walked = walkTo(document, key);
  return walked && idOf(walked.value) !== null ? uploadCollectionAt(schema, walked.steps) : null;
};

export const replacedUploadOf = (
  document: unknown,
  schema: EditableSchema,
  key: string,
  mediaId: number | string
): EditedField | null => {
  const walked = walkTo(document, key);
  const collection = walked && uploadCollectionAt(schema, walked.steps);
  if (!walked || !collection || !mayHoldOneDocument(walked.value)) return null;
  return fieldWith(document, walked, mediaId);
};

const mayHoldRichText = (value: unknown): boolean =>
  rootOf(value) !== null || value === null || value === undefined;

export type ShownRichText = { steps: readonly FieldStep[]; value: VeEditorState };

export const shownRichTextOf = (
  document: unknown,
  schema: EditableSchema,
  key: string
): ShownRichText | null => {
  const walked = walkTo(document, key);
  if (!walked || !isRichTextAt(schema, walked.steps)) return null;
  return isEditorStateTree(walked.value) ? { steps: walked.steps, value: walked.value } : null;
};

export type RichTextEdit = {
  key: string;
  state: VeEditorState;
  shown: VeEditorState;
  formats: VeRichTextFormats;
};

export const editedRichTextOf = (
  document: unknown,
  schema: EditableSchema,
  { formats, key, shown, state }: RichTextEdit
): EditedField | null => {
  const walked = walkTo(document, key);
  if (!walked || !isRichTextAt(schema, walked.steps) || !mayHoldRichText(walked.value)) return null;
  const edited = editedStateOf(state, { formats, shown, stored: walked.value });
  return edited && fieldWith(document, walked, edited);
};
