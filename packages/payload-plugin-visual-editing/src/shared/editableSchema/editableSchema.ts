import type { FieldStep } from "../fieldKey.js";
import type { PlainObject } from "../plainObject.js";
import type { ReferencedBlocks, SchemaField } from "./schemaOfFields.js";

import { FIELD_PATH_SEPARATOR, isRowIndex } from "../fieldKey.js";
import {
  DEFAULT_INTERNAL_FIELD_NAMES,
  isLocalizedField,
  schemaOfFields,
} from "./schemaOfFields.js";
import { isPlainObject } from "../plainObject.js";
import { rowWithId } from "../rowWithId.js";

export type { SchemaField } from "./schemaOfFields.js";

export type EditableSchema = PlainObject;

type EditableSchemaOptions = {
  excludeFieldNames?: readonly string[];
  referencedBlocks?: ReferencedBlocks;
};

type FieldKind = "fields" | "richText" | "text" | "value";

export type HolderField = {
  kind: FieldKind;
  textFieldNames: () => readonly string[];
  holdsValuePerLocale: boolean;
  locale?: string;
  localeSegmentIndexes: readonly number[];
};

type RichTextValue = { holder: PlainObject; property: string };

type SchemaNode = string | PlainObject;

type Position = { data: unknown; schema: unknown };

const TEXT_FIELD_TYPES: ReadonlySet<unknown> = new Set(["text", "textarea", "email"]);

const RICH_TEXT_FIELD_TYPE = "richText";

const isText = (schemaNode: unknown): boolean => TEXT_FIELD_TYPES.has(schemaNode);

const isRichText = (schemaNode: unknown): boolean => schemaNode === RICH_TEXT_FIELD_TYPE;

const kindOf = (schemaNode: SchemaNode): FieldKind => {
  if (isPlainObject(schemaNode)) return "fields";
  if (isText(schemaNode)) return "text";
  return isRichText(schemaNode) ? "richText" : "value";
};

const textFieldNamesOf = (schemaNode: SchemaNode): string[] =>
  isPlainObject(schemaNode)
    ? Object.keys(schemaNode).filter((name) => isText(schemaNode[name]))
    : [];

const ownField = (schema: PlainObject, name: string): unknown =>
  Object.hasOwn(schema, name) ? schema[name] : undefined;

const schemaOfRow = (schema: unknown, row: PlainObject): unknown => {
  const { blockType } = row;
  if (!isPlainObject(schema) || typeof blockType !== "string") return schema;
  return ownField(schema, blockType) ?? schema;
};

export const buildEditableSchema = (
  fields: readonly SchemaField[],
  { excludeFieldNames = [], referencedBlocks = {} }: EditableSchemaOptions = {}
): EditableSchema =>
  schemaOfFields(fields, {
    internalFieldNames: new Set([...DEFAULT_INTERNAL_FIELD_NAMES, ...excludeFieldNames]),
    referencedBlocks,
  });

const stepInto = (schemaNode: PlainObject, step: FieldStep): unknown => {
  if ("name" in step) return ownField(schemaNode, step.name);
  return step.blockType === undefined ? schemaNode : ownField(schemaNode, step.blockType);
};

export const isMarkable = (schema: EditableSchema, steps: readonly FieldStep[]): boolean => {
  let schemaNode: unknown = schema;
  for (const step of steps) {
    if (!isPlainObject(schemaNode)) return false;
    schemaNode = stepInto(schemaNode, step);
  }
  return isText(schemaNode) || isRichText(schemaNode);
};

export const holderFieldAt = (
  schema: EditableSchema,
  rootData: unknown,
  segments: readonly string[],
  localeKeys: ReadonlySet<string>
): HolderField | null => {
  let schemaNode: SchemaNode = schema;
  let data: unknown = rootData;
  let holdsValuePerLocale = false;
  let locale: string | undefined;
  const localeSegmentIndexes: number[] = [];

  for (const [index, segment] of segments.entries()) {
    if (holdsValuePerLocale) {
      holdsValuePerLocale = false;
      if (localeKeys.has(segment)) {
        locale = segment;
        localeSegmentIndexes.push(index);
        data = isPlainObject(data) ? data[segment] : undefined;
        continue;
      }
    }

    if (isRowIndex(segment)) {
      if (!Array.isArray(data)) return null;
      data = data[Number(segment)];
      if (isPlainObject(data)) schemaNode = schemaOfRow(schemaNode, data) as SchemaNode;
      continue;
    }

    if (!isPlainObject(schemaNode)) return null;
    const fieldSchema = ownField(schemaNode, segment);
    if (fieldSchema === undefined) return null;
    holdsValuePerLocale = localeKeys.size > 0 && isLocalizedField(schemaNode, segment);
    schemaNode = fieldSchema as SchemaNode;
    data = isPlainObject(data) ? ownField(data, segment) : undefined;
  }

  return {
    holdsValuePerLocale,
    kind: kindOf(schemaNode),
    locale,
    localeSegmentIndexes,
    textFieldNames: () => textFieldNamesOf(schemaNode),
  };
};

const intoRow = ({ data, schema }: Position, rowId: string): Position | null => {
  const row = rowWithId(data, rowId);
  return row ? { data: row, schema: schemaOfRow(schema, row) } : null;
};

const holderOfField = (
  { data, schema }: Position,
  fieldName: string,
  locale: string | undefined
): (RichTextValue & { schema: unknown }) | null => {
  if (!isPlainObject(data) || !isPlainObject(schema)) return null;
  const fieldSchema = ownField(schema, fieldName);
  if (fieldSchema === undefined) return null;
  if (!isLocalizedField(schema, fieldName)) {
    return { holder: data, property: fieldName, schema: fieldSchema };
  }
  const valuePerLocale = data[fieldName];
  if (locale === undefined || !isPlainObject(valuePerLocale)) return null;
  return { holder: valuePerLocale, property: locale, schema: fieldSchema };
};

export const richTextValueAt = (
  schema: EditableSchema,
  document: unknown,
  fieldKey: string,
  locale: string | undefined
): RichTextValue | null => {
  const segments = fieldKey.split(FIELD_PATH_SEPARATOR);
  const fieldName = segments.pop();
  if (fieldName === undefined) return null;

  let position: Position | null = { data: document, schema };
  for (const segment of segments) {
    if (Array.isArray(position.data)) {
      position = intoRow(position, segment);
    } else {
      const field = holderOfField(position, segment, locale);
      position = field && { data: field.holder[field.property], schema: field.schema };
    }
    if (!position) return null;
  }

  const field = holderOfField(position, fieldName, locale);
  return field && isRichText(field.schema)
    ? { holder: field.holder, property: field.property }
    : null;
};

const fieldsNamed = (schemas: readonly unknown[], name: string): unknown[] =>
  schemas
    .filter(isPlainObject)
    .flatMap((schemaNode) => [schemaNode, ...Object.values(schemaNode).filter(isPlainObject)])
    .map((schemaNode) => ownField(schemaNode, name))
    .filter((field) => field !== undefined);

export const schemaPathOfRichText = (schema: EditableSchema, fieldKey: string): string | null => {
  const segments = fieldKey.split(FIELD_PATH_SEPARATOR);
  const fieldName = segments.pop();
  if (fieldName === undefined) return null;

  let schemas: unknown[] = [schema];
  const path: string[] = [];
  let isAfterRow = false;
  for (const segment of segments) {
    const named = fieldsNamed(schemas, segment);
    if (named.length > 0) {
      schemas = named;
      path.push(segment);
      isAfterRow = false;
    } else if (isAfterRow || path.length === 0) {
      return null;
    } else {
      isAfterRow = true;
    }
  }
  const isRichTextField = fieldsNamed(schemas, fieldName).some(isRichText);
  return isRichTextField ? [...path, fieldName].join(FIELD_PATH_SEPARATOR) : null;
};
