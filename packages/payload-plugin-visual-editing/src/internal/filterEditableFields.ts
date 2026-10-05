import type { Field } from "payload";

type UnknownRecord = Record<string, unknown>;

// Identifier/URL-like fields we never want stega to touch. `slug` values flow into
// preview URLs, where embedded zero-width chars become noisy %E2%80%8B sequences.
const DEFAULT_INTERNAL_FIELD_NAMES = new Set(["_status", "folder", "slug"]);

// Runtime-only / admin-only keys — must not leak into the serialised schema.
const STRIPPED_KEYS = new Set([
  "admin",
  "validate",
  "hooks",
  "access",
  "filterOptions",
  "required",
  "unique",
  "index",
  "minLength",
  "maxLength",
  "minRows",
  "maxRows",
  "min",
  "max",
  "custom",
  "interfaceName",
  "imageURL",
  "imageAltText",
  "dbName",
  "_sanitized",
  "labels",
  "editor",
]);

export const filterEditableFields = (
  fields: Field[],
  internalFieldNames: ReadonlySet<string> = DEFAULT_INTERNAL_FIELD_NAMES
): Field[] => {
  const result: Field[] = [];

  for (const raw of fields) {
    if (isHiddenOrReadOnly(raw) || isInternal(raw, internalFieldNames) || raw.type === "ui")
      continue;

    const field = stripKeys(asRecord(raw)) as Field;

    if (field.type === "tabs") {
      result.push({
        ...field,
        tabs: field.tabs.map((tab) => ({
          ...stripKeys(asRecord(tab)),
          fields: filterEditableFields(tab.fields, internalFieldNames),
        })) as typeof field.tabs,
      });
      continue;
    }

    if (field.type === "blocks") {
      result.push({
        ...field,
        blocks: field.blocks.map((block) => ({
          ...stripKeys(asRecord(block)),
          fields: filterEditableFields(block.fields, internalFieldNames),
        })) as typeof field.blocks,
      });
      continue;
    }

    if (hasSubfields(field)) {
      result.push({
        ...field,
        fields: filterEditableFields(field.fields, internalFieldNames),
      } as Field);
      continue;
    }

    result.push(field);
  }

  return result;
};

const isHiddenOrReadOnly = (field: Field): boolean => {
  const admin = asRecord(field).admin as { hidden?: boolean; readOnly?: boolean } | undefined;
  return admin?.hidden === true || admin?.readOnly === true;
};

const isInternal = (field: Field, internalFieldNames: ReadonlySet<string>): boolean => {
  const name = asRecord(field).name;
  return typeof name === "string" && internalFieldNames.has(name);
};

const hasSubfields = (field: Field): field is Field & { fields: Field[] } =>
  Array.isArray(asRecord(field).fields);

const stripKeys = <T extends UnknownRecord>(obj: T): T => {
  const result: UnknownRecord = {};
  for (const key in obj) {
    if (STRIPPED_KEYS.has(key)) continue;
    result[key] = obj[key];
  }
  return result as T;
};

const asRecord = (value: unknown): UnknownRecord => value as UnknownRecord;
