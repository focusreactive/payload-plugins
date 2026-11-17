import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { FieldStep } from "../../shared/fieldKey.js";
import type { PlainObject } from "../../shared/plainObject.js";

import { textFieldTypeAt } from "../../shared/editableSchema/editableSchema.js";
import { editedTextOf } from "../../shared/fieldEdit.js";
import { FIELD_PATH_SEPARATOR } from "../../shared/fieldKey.js";
import { isPlainObject } from "../../shared/plainObject.js";

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

const holdsText = (value: unknown): boolean =>
  typeof value === "string" || value === null || value === undefined;

export const editedFieldOf = (
  document: unknown,
  schema: EditableSchema,
  key: string,
  value: string
): EditedField | null => {
  const walked = walkTo(document, key);
  const fieldType = walked && textFieldTypeAt(schema, walked.steps);
  if (!walked || !fieldType || !holdsText(walked.value)) return null;
  const [name, ...rest] = walked.path;
  if (typeof name !== "string" || !isPlainObject(document)) return null;
  return { name, value: withValueAt(document[name], rest, editedTextOf(fieldType, value)) };
};
