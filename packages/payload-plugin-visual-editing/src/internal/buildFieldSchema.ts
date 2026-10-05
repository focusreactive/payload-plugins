import type { Field } from "payload";

import { isPlainObject } from "./shared.js";
import type { PlainObject } from "./shared.js";

export const buildFieldSchema = (fields: Field[]): PlainObject => {
  const result: PlainObject = {};
  for (const field of fields) {
    if (!isPlainObject(field)) continue;
    mergeField(result, field);
  }
  return result;
};

const mergeField = (result: PlainObject, field: PlainObject): void => {
  const { type } = field;
  const name = getString(field.name);

  // Transparent containers — their fields live in the parent's path namespace.
  if ((type === "row" || type === "collapsible") && Array.isArray(field.fields)) {
    Object.assign(result, buildFieldSchema(field.fields as Field[]));
    return;
  }

  if (type === "group" && !name && Array.isArray(field.fields)) {
    Object.assign(result, buildFieldSchema(field.fields as Field[]));
    return;
  }

  if (type === "tabs" && Array.isArray(field.tabs)) {
    for (const raw of field.tabs) {
      if (!isPlainObject(raw)) continue;
      const tabFields = Array.isArray(raw.fields) ? (raw.fields as Field[]) : [];
      const tabName = getString(raw.name);
      if (tabName) {
        result[tabName] = buildFieldSchema(tabFields);
      } else {
        Object.assign(result, buildFieldSchema(tabFields));
      }
    }
    return;
  }

  if (!name) return;
  result[name] = buildValue(field);
};

const buildValue = (field: PlainObject): unknown => {
  const { type } = field;

  if (type === "blocks" && Array.isArray(field.blocks)) {
    const result: PlainObject = {};
    for (const block of field.blocks) {
      if (!isPlainObject(block)) continue;
      const slug = getString(block.slug);
      if (!slug) continue;
      const inner = Array.isArray(block.fields) ? (block.fields as Field[]) : [];
      result[slug] = buildFieldSchema(inner);
    }
    return result;
  }

  if ((type === "array" || type === "group") && Array.isArray(field.fields)) {
    return buildFieldSchema(field.fields as Field[]);
  }

  // Encode relation target so consumers can descend into populated docs using
  // the related collection's schema.
  if (type === "relationship" || type === "upload") {
    const relationTo = field.relationTo;
    if (typeof relationTo === "string") return `${type}:${relationTo}`;
    if (Array.isArray(relationTo) && relationTo.every((s) => typeof s === "string")) {
      return `${type}:${(relationTo as string[]).join("|")}`;
    }
  }

  return getString(type) ?? "unknown";
};

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
