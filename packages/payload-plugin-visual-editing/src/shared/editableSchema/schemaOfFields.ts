import type { ClientField, Field } from "payload";

import type { PlainObject } from "../plainObject.js";

import { isPlainObject } from "../plainObject.js";

export type SchemaField = ClientField | Field;

type SchemaBlock = { fields: SchemaField[]; slug: string };

export type ReferencedBlocks = Readonly<Record<string, SchemaBlock | undefined>>;

export type SchemaRules = {
  internalFieldNames: ReadonlySet<string>;
  referencedBlocks: ReferencedBlocks;
};

type Build = SchemaRules & { blockSchemas: Map<BlockRecord, PlainObject> };

type FieldsHolder = PlainObject & { fields: unknown[] };

type BlockRecord = FieldsHolder & { slug: string };

export const DEFAULT_INTERNAL_FIELD_NAMES: ReadonlySet<string> = new Set([
  "_status",
  "apiKey",
  "folder",
  "slug",
]);

const BLOCK_NAME_FIELD = "blockName";

const localizedNamesBySchema = new WeakMap<PlainObject, Set<string>>();

export const isLocalizedField = (schema: PlainObject, fieldName: string): boolean =>
  localizedNamesBySchema.get(schema)?.has(fieldName) ?? false;

const rememberLocalizedField = (schema: PlainObject, fieldName: string): void => {
  const localizedNames = localizedNamesBySchema.get(schema) ?? new Set<string>();
  localizedNames.add(fieldName);
  localizedNamesBySchema.set(schema, localizedNames);
};

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const stringOf = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const holdsFields = (value: unknown): value is FieldsHolder =>
  isPlainObject(value) && Array.isArray(value.fields);

const isBlock = (value: unknown): value is BlockRecord =>
  holdsFields(value) && typeof value.slug === "string";

const isOutOfEditorsReach = ({ admin, hidden }: PlainObject): boolean => {
  const { disabled, hidden: hiddenInAdmin, readOnly } = isPlainObject(admin) ? admin : {};
  return hidden === true || hiddenInAdmin === true || readOnly === true || disabled === true;
};

const isEditable = (field: unknown, { internalFieldNames }: Build): field is PlainObject => {
  if (!isPlainObject(field) || field.type === "ui" || isOutOfEditorsReach(field)) return false;
  const name = stringOf(field.name);
  return name === undefined || !internalFieldNames.has(name);
};

const showsNameInHeader = ({ admin }: PlainObject): boolean =>
  !isPlainObject(admin) || admin.disableBlockName !== true;

const isBlockName = (field: PlainObject): boolean =>
  field.name === BLOCK_NAME_FIELD && field.type === "text";

const withNameEditableInHeader = (block: BlockRecord): unknown[] =>
  showsNameInHeader(block)
    ? block.fields.map((field) => {
        if (!isPlainObject(field) || !isBlockName(field)) return field;
        const admin = isPlainObject(field.admin) ? field.admin : {};
        return { ...field, admin: { ...admin, disabled: false } };
      })
    : block.fields;

const declaredBlocks = (
  { blockReferences, blocks }: PlainObject,
  referencedBlocks: ReferencedBlocks
): BlockRecord[] => {
  const referenced = listOf(blockReferences).map((reference) =>
    typeof reference === "string" ? referencedBlocks[reference] : reference
  );
  return [...referenced, ...listOf(blocks)].filter(isBlock);
};

const addNamedField = (
  schema: PlainObject,
  name: string,
  value: unknown,
  { localized }: PlainObject
): void => {
  schema[name] = value;
  if (localized === true) rememberLocalizedField(schema, name);
};

const mergeFields = (
  schema: PlainObject,
  fields: readonly unknown[],
  build: Build
): PlainObject => {
  for (const field of fields) {
    if (isEditable(field, build)) mergeField(schema, field, build);
  }
  return schema;
};

const mergeField = (schema: PlainObject, field: PlainObject, build: Build): void => {
  const { type } = field;
  const name = stringOf(field.name);

  if (
    (type === "row" || type === "collapsible" || (type === "group" && !name)) &&
    holdsFields(field)
  ) {
    mergeFields(schema, field.fields, build);
    return;
  }

  if (type === "tabs") {
    for (const tab of listOf(field.tabs).filter(holdsFields)) {
      const tabName = stringOf(tab.name);
      if (tabName) {
        addNamedField(schema, tabName, mergeFields({}, tab.fields, build), tab);
      } else {
        mergeFields(schema, tab.fields, build);
      }
    }
    return;
  }

  if (name) addNamedField(schema, name, valueOf(field, build), field);
};

const valueOf = (field: PlainObject, build: Build): unknown => {
  const { type } = field;

  if (type === "blocks") {
    const schema: PlainObject = {};
    for (const block of declaredBlocks(field, build.referencedBlocks)) {
      if (!block.slug) continue;
      schema[block.slug] = blockSchemaOf(block, build);
    }
    return schema;
  }

  if ((type === "array" || type === "group") && holdsFields(field)) {
    return mergeFields({}, field.fields, build);
  }

  return stringOf(type) ?? "unknown";
};

const blockSchemaOf = (block: BlockRecord, build: Build): PlainObject => {
  const alreadyBuilt = build.blockSchemas.get(block);
  if (alreadyBuilt) return alreadyBuilt;

  const schema: PlainObject = {};
  build.blockSchemas.set(block, schema);
  return mergeFields(schema, withNameEditableInHeader(block), build);
};

export const schemaOfFields = (fields: readonly SchemaField[], rules: SchemaRules): PlainObject =>
  mergeFields({}, fields, { ...rules, blockSchemas: new Map() });
