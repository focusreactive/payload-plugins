import type { CollectionSlug } from "payload";

import { isMetaInfo, isPlainObject, META_KEY } from "./shared.js";
import type { PlainObject } from "./shared.js";

type SchemaNode = string | PlainObject;
type ResolveSchema = (slug: CollectionSlug) => SchemaNode | null;

const UPLOAD_SCHEMA_PATTERN = /^upload:(.+)$/;

/**
 * Walk the doc tree; for every descendant object with its own `_meta`, look up
 * its collection's schema and descend into the data in parallel. Whenever the
 * schema says an `upload:<slug>` field lives at a key and the data has a
 * populated value there, flip that value's `_meta.terminal = true` so the outer
 * stega encoder skips it (preserving its identity for client-side wrapper attrs).
 */
export const markTerminalUploads = (data: unknown, resolveSchema: ResolveSchema): void => {
  if (Array.isArray(data)) {
    for (const item of data) markTerminalUploads(item, resolveSchema);
    return;
  }
  if (!isPlainObject(data)) return;

  const meta = data[META_KEY];
  if (isMetaInfo(meta) && !meta.terminal) {
    const schema = resolveSchema(meta.collectionSlug);
    if (schema !== null) walkSchema(schema, data);
  }

  // Continue into non-meta children so we reach nested enriched docs whose
  // walks haven't started yet (e.g. a relationship populated inside a block).
  for (const key in data) {
    if (key === META_KEY) continue;
    markTerminalUploads(data[key], resolveSchema);
  }
};

const walkSchema = (schema: SchemaNode, data: PlainObject): void => {
  if (!isPlainObject(schema)) return;

  for (const key of Object.keys(schema)) {
    const fieldSchema = schema[key] as SchemaNode;
    const value = data[key];
    if (value === undefined || value === null) continue;

    if (typeof fieldSchema === "string") {
      if (UPLOAD_SCHEMA_PATTERN.test(fieldSchema)) markUpload(value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isPlainObject(item)) continue;
        const sub = pickSubSchemaForArrayItem(fieldSchema, item);
        if (sub) walkSchema(sub, item);
      }
      continue;
    }

    if (isPlainObject(value)) {
      walkSchema(fieldSchema, value);
    }
  }
};

// Blocks schemas are `{ <blockSlug>: <subSchema> }`; array rows share a single
// sub-schema regardless of row index, which `buildFieldSchema` also flattens to
// a single object under the array key. We disambiguate blocks via `blockType`.
const pickSubSchemaForArrayItem = (
  fieldSchema: PlainObject,
  item: PlainObject
): PlainObject | null => {
  if (typeof item.blockType === "string" && item.blockType in fieldSchema) {
    const candidate = fieldSchema[item.blockType];
    return isPlainObject(candidate) ? candidate : null;
  }
  return fieldSchema;
};

const markUpload = (value: unknown): void => {
  let target: PlainObject | null = null;

  if (isPlainObject(value)) {
    // Polymorphic upload: unwrap {relationTo, value}
    if (typeof value.relationTo === "string" && isPlainObject(value.value)) {
      target = value.value;
    } else {
      target = value;
    }
  }

  if (!target) return;

  const meta = target[META_KEY];
  if (!isMetaInfo(meta)) return;

  target[META_KEY] = { ...meta, terminal: true };
};
