import type { Field } from "payload";

import { isTranslatableField } from "../../shared";
import { findFieldByPath } from "../../../core/kernel/field-traversal";

/**
 * Outcome of mapping a declared field path to a translatable subtree.
 *
 * - `resolved` — the path lands on a translatable leaf; `schema` + `sourceData`
 *   are ready for `translateContent`, and `fieldName` is the key to unwrap the result.
 * - `not-found` — the path resolves to no field at all (a typo) → caller returns 400.
 * - `not-translatable` — resolves to a field that isn't a text-like leaf → caller no-ops.
 * - `inside-blocks` — the path descends through a polymorphic `blocks` field that couldn't be
 *   resolved: no `doc` was supplied to read the element's `blockType` from → caller no-ops.
 * - `localized-list-ancestor` — the path descends through a `localized` `blocks`/`array` field,
 *   whose per-locale order/content is independent, so a positional path can't be matched across
 *   locales → caller no-ops (translate the whole document instead).
 */
export type FieldSubtreeResolution =
  | { status: "resolved"; schema: Field[]; sourceData: Record<string, unknown>; fieldName: string }
  | { status: "not-found" }
  | { status: "not-translatable" }
  | { status: "inside-blocks" }
  | { status: "localized-list-ancestor" };

/**
 * Map a declared `fieldPath` to the `{ schema, sourceData }` pair `translateContent` expects.
 * Walks the schema via the shared {@link findFieldByPath}. Descends transparently through
 * presentational containers (row, collapsible, unnamed tabs) and through named group/array/tab
 * containers; array element indices select the data item but not the schema (shared across items).
 *
 * Pass `doc` (the document the path belongs to) to descend through polymorphic `blocks` fields:
 * the element's `blockType` in `doc` picks the block schema. Without `doc`, a path through a
 * `blocks` field returns `inside-blocks`.
 */
export function resolveFieldSubtree(
  rootFields: Field[],
  fieldPath: string,
  value: unknown,
  doc?: unknown
): FieldSubtreeResolution {
  const segments = fieldPath
    .split(".")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) return { status: "not-found" };

  const result = findFieldByPath(rootFields, segments, doc);
  switch (result.status) {
    case "leaf":
      return isTranslatableField(result.field)
        ? {
            status: "resolved",
            schema: [result.field],
            sourceData: { [result.field.name]: value },
            fieldName: result.field.name,
          }
        : { status: "not-translatable" };
    case "container":
      return { status: "not-translatable" };
    case "inside-blocks":
      return { status: "inside-blocks" };
    case "localized-list-ancestor":
      return { status: "localized-list-ancestor" };
    case "not-found":
      return { status: "not-found" };
  }
}
