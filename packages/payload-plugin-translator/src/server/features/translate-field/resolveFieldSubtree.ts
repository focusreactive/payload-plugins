import type { Field } from "payload";

import { isTranslatableField } from "../../shared";
import { findFieldByPath } from "../../shared/field-traversal";

/**
 * Outcome of mapping a declared field path to a translatable subtree.
 *
 * - `resolved` — the path lands on a translatable leaf; `schema` + `sourceData`
 *   are ready for `translateContent`, and `fieldName` is the key to unwrap the result.
 * - `not-found` — the path resolves to no field at all (a typo) → caller returns 400.
 * - `not-translatable` — resolves to a field that isn't a text-like leaf → caller no-ops.
 * - `inside-blocks` — the path descends through a polymorphic `blocks` field, which
 *   can't be resolved from the path alone (the blockType lives in the data) → caller no-ops.
 */
export type FieldSubtreeResolution =
  | { status: "resolved"; schema: Field[]; sourceData: Record<string, unknown>; fieldName: string }
  | { status: "not-found" }
  | { status: "not-translatable" }
  | { status: "inside-blocks" };

const isIndexSegment = (segment: string): boolean => /^\d+$/u.test(segment);

/**
 * Map a declared `fieldPath` to the `{ schema, sourceData }` pair `translateContent` expects.
 * Walks the schema by field name (via the shared {@link findFieldByPath}), dropping array indices
 * (a field's config is shared across array items). Descends transparently through presentational
 * containers (row, collapsible, unnamed tabs) and through named group/array/tab containers. A path
 * that descends through a `blocks` field returns `inside-blocks`.
 */
export function resolveFieldSubtree(rootFields: Field[], fieldPath: string, value: unknown): FieldSubtreeResolution {
  const segments = fieldPath
    .split(".")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && !isIndexSegment(segment));
  if (segments.length === 0) return { status: "not-found" };

  const result = findFieldByPath(rootFields, segments);
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
    case "not-found":
      return { status: "not-found" };
  }
}
