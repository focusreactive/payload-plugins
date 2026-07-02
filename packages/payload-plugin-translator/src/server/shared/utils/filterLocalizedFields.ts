import type { Field } from "payload";

import type { ChildCursor, FieldWalker } from "../../../core/field-traversal";
import { resolveBlockFields, walkFields } from "../../../core/field-traversal";
import { isLocalizedField, isTranslatableField } from "../guards";
import { isObject } from "../../../core/utils/isObject";

/** Data position for the filter walk: a single data object at the current schema level. */
type Cursor = { data: Record<string, unknown> };

/**
 * Filter walker: keeps only translatable, localized leaves, rebuilding the surrounding
 * object/array/blocks structure and dropping any container left empty. `id` (array/block
 * elements) and `blockType` (block elements) are preserved since they aren't schema fields.
 */
const filterWalker: FieldWalker<Cursor, unknown> = {
  enterObject(field, cursor) {
    const value = cursor.data[field.name];
    return isObject(value) ? { data: value } : "skip";
  },

  enterList(field, cursor) {
    const value = cursor.data[field.name];
    if (!Array.isArray(value)) return "skip";

    const children: ChildCursor<Cursor>[] = [];
    value.forEach((item, index) => {
      if (!isObject(item)) return; // drop non-object elements
      const fields = field.type === "blocks" ? resolveBlockFields(field, item) : field.fields;
      if (fields) children.push({ cursor: { data: item }, fields, key: index }); // unknown blockType → fields null → drop
    });
    return children;
  },

  leaf(field, cursor) {
    return isTranslatableField(field) && isLocalizedField(field)
      ? cursor.data[field.name]
      : undefined;
  },

  combine(container, children, cursor) {
    if (children.length === 0) return undefined; // drop empty containers/lists

    if (container.kind === "list") return children.map((child) => child.out);

    const result: Record<string, unknown> = {};
    for (const child of children) result[child.key] = child.out;

    if (container.kind === "element") {
      const item = cursor.data;
      if (item.id !== undefined) result.id = item.id;
      if (container.field.type === "blocks") result.blockType = item.blockType;
    }

    return result;
  },
};

/**
 * Filters data to keep only translatable localized fields, recursively for container fields
 * (group, array, blocks, named tabs). Built on the shared {@link walkFields} engine.
 *
 * @param schema - Payload field schema (original, not sanitized)
 * @param data - Document data to filter
 * @returns Filtered data containing only translatable localized fields
 */
export function filterLocalizedFields(
  schema: Field[],
  data: Record<string, unknown>
): Record<string, unknown> {
  return (walkFields(schema, { data }, filterWalker) as Record<string, unknown> | undefined) ?? {};
}
