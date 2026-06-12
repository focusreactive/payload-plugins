import type { Field } from "payload";

import { isEmpty, isObject } from "../../../../shared";
import type { ChildCursor, FieldWalker } from "../../../../shared/field-traversal";
import { matchElementById, resolveBlockFields, walkFields } from "../../../../shared/field-traversal";

/** Data position for the reconcile walk: the source + target objects at the current level. */
type Cursor = { source: Record<string, unknown>; target: Record<string, unknown> };

const asObject = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});

/**
 * Reconcile walker: produces the full document shape from source + target, with target
 * priority (source fills empty target slots). Iteration is driven by `source`; a field with
 * no source value is dropped, `id` is stripped from array/block elements (Postgres rejects it
 * on update), `blockType` is preserved, and non-object array items / unknown blocks pass
 * through unchanged.
 *
 * Array/block elements are paired with their target counterpart by `id`, not by position (see
 * {@link matchElementById}); output order always follows `source`.
 */
const reconcileWalker: FieldWalker<Cursor, unknown> = {
  enterObject(field, cursor) {
    const sourceValue = cursor.source[field.name];
    if (!isObject(sourceValue)) return "skip"; // undefined / non-object source → drop the field
    return { source: sourceValue, target: asObject(cursor.target[field.name]) };
  },

  enterList(field, cursor) {
    const sourceValue = cursor.source[field.name];
    if (!Array.isArray(sourceValue)) return "skip";
    const targetValue = cursor.target[field.name];
    const targetArr: unknown[] = Array.isArray(targetValue) ? targetValue : [];
    const isBlocks = field.type === "blocks";

    const children: ChildCursor<Cursor>[] = [];
    sourceValue.forEach((item, index) => {
      if (!isObject(item)) return; // non-object element → passthrough (rebuilt in combine)
      const fields = isBlocks ? resolveBlockFields(field, item) : field.fields;
      if (!fields) return; // unknown blockType → passthrough
      // Pair by id, not position: target[index] may be a different element under per-locale ordering.
      children.push({ cursor: { source: item, target: matchElementById(targetArr, item, isBlocks) }, fields, key: index });
    });
    return children;
  },

  leaf(field, cursor) {
    const sourceValue = cursor.source[field.name];
    if (sourceValue === undefined) return undefined; // no source value → field dropped
    const targetValue = cursor.target[field.name];
    return isEmpty(targetValue) ? sourceValue : targetValue; // target priority, fallback to source
  },

  combine(container, children, cursor) {
    if (container.kind === "list") {
      // Rebuild the full array in source order: reconciled objects keyed by source position, raw
      // source items (non-object / unknown block) otherwise.
      const sourceArr = (cursor.source[container.key] ?? []) as unknown[];
      const byIndex = new Map(children.map((child) => [child.key, child.out]));
      return sourceArr.map((item, index) => (byIndex.has(index) ? byIndex.get(index) : item));
    }

    const result: Record<string, unknown> = {};
    for (const child of children) result[child.key] = child.out;
    // Block elements keep their blockType; id is intentionally stripped (Postgres rejects it on update).
    if (container.kind === "element" && container.field.type === "blocks") {
      result.blockType = cursor.source.blockType;
    }
    return result;
  },
};

/**
 * Deep-merges source and target data with target priority, producing the full document shape
 * Payload validation needs. Built on the shared {@link walkFields} engine.
 *
 * Stage 1 of the translation pipeline.
 */
export class DataReconciler {
  private readonly schema: Field[];

  constructor(schema: Field[]) {
    this.schema = schema;
  }

  /**
   * Reconciles source and target data into a complete document shape.
   *
   * @param sourceData - Source locale document data
   * @param targetData - Target locale document data (may be empty/partial)
   * @returns Complete document shape with reconciled field values
   */
  reconcile(sourceData: Record<string, unknown>, targetData: Record<string, unknown>): Record<string, unknown> {
    const root: Cursor = { source: sourceData, target: targetData ?? {} };
    return (walkFields(this.schema, root, reconcileWalker) as Record<string, unknown> | undefined) ?? {};
  }
}
