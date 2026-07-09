import { isEmpty } from "../../../utils/isEmpty";
import { isObject } from "../../../utils/isObject";
import type { ChildCursor, FieldLike, FieldWalker } from "../../../field-traversal";
import { matchElementById, resolveBlockFields, walkFields } from "../../../field-traversal";

/**
 * Data position for the reconcile walk: the source + target objects at the current level, plus
 * whether the current row is SHARED across locales.
 *
 * `sharedRow` decides array/block `id` retention on output — the data-loss-critical bit. A row is
 * shared when neither the container nor any ancestor is `localized`: Payload then stores ONE row
 * with per-locale leaf columns, so its `id` is a stable cross-locale key and must survive
 * `payload.update({ locale })` (else Payload can't match the row, deletes + recreates it, and wipes
 * every other locale's values). Under a `localized` container/ancestor the rows are per-locale
 * (independent ids), so the id is stripped — keeping it would collide with the source locale's row.
 */
type Cursor = {
  source: Record<string, unknown>;
  target: Record<string, unknown>;
  sharedRow: boolean;
};

const asObject = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});

/**
 * Reconcile walker: produces the full document shape from source + target, with target
 * priority (source fills empty target slots). Iteration is driven by `source`; a field with
 * no source value is dropped, `blockType` is preserved, non-object array items / unknown blocks
 * pass through unchanged, and array/block `id` is kept for shared rows but stripped for per-locale
 * rows (see {@link Cursor.sharedRow} — the data-loss-critical bit).
 *
 * Array/block elements are paired with their target counterpart by `id`, not by position (see
 * {@link matchElementById}); output order always follows `source`.
 */
const reconcileWalker: FieldWalker<Cursor, unknown> = {
  enterObject(field, cursor) {
    const sourceValue = cursor.source[field.name];
    if (!isObject(sourceValue)) return "skip"; // undefined / non-object source → drop the field
    // A localized group or named tab partitions its whole subtree per locale → descendants are
    // per-locale rows (Payload's sanitizer propagates `tab.localized` the same as a group).
    return {
      source: sourceValue,
      target: asObject(cursor.target[field.name]),
      sharedRow: cursor.sharedRow && !field.localized,
    };
  },

  enterList(field, cursor) {
    const sourceValue = cursor.source[field.name];
    if (!Array.isArray(sourceValue)) return "skip";
    const targetValue = cursor.target[field.name];
    const targetArr: unknown[] = Array.isArray(targetValue) ? targetValue : [];
    const isBlocks = field.type === "blocks";
    // Elements are shared rows only when this container AND every ancestor is non-localized.
    const childShared = cursor.sharedRow && !field.localized;

    const children: ChildCursor<Cursor>[] = [];
    sourceValue.forEach((item, index) => {
      if (!isObject(item)) return; // non-object element → passthrough (rebuilt in combine)
      const fields = isBlocks ? resolveBlockFields(field, item) : field.fields;
      if (!fields) return; // unknown blockType → passthrough
      // Pair by id, not position: target[index] may be a different element under per-locale ordering.
      children.push({
        cursor: {
          source: item,
          target: matchElementById(targetArr, item, isBlocks),
          sharedRow: childShared,
        },
        fields,
        key: index,
      });
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
      // Passthrough items (unknown blockType / unresolved fields) never reach the element branch's
      // id guard, so apply the same rule here: strip a per-locale row's id to avoid an insert
      // collision. Elements are shared only when this container and every ancestor is non-localized.
      const childShared = cursor.sharedRow && !container.field.localized;
      return sourceArr.map((item, index) => {
        if (byIndex.has(index)) return byIndex.get(index);
        if (!childShared && isObject(item) && item.id != null) {
          const { id: _dropped, ...rest } = item;
          return rest;
        }
        return item;
      });
    }

    const result: Record<string, unknown> = {};
    for (const child of children) result[child.key] = child.out;
    if (container.kind === "element") {
      // Block elements keep their blockType.
      if (container.field.type === "blocks") result.blockType = cursor.source.blockType;
      // Keep `id` only for a shared (non-localized, no localized ancestor) row so Payload updates it
      // in place; stripping it there makes Payload recreate the row and wipe other locales. Under a
      // localized container/ancestor the rows are per-locale, so the id is dropped to avoid an
      // insert collision with the source locale's row. Guard against writing `id: undefined`.
      if (cursor.sharedRow && cursor.source.id != null) result.id = cursor.source.id;
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
  private readonly schema: FieldLike[];

  constructor(schema: FieldLike[]) {
    this.schema = schema;
  }

  /**
   * Reconciles source and target data into a complete document shape.
   *
   * @param sourceData - Source locale document data
   * @param targetData - Target locale document data (may be empty/partial)
   * @returns Complete document shape with reconciled field values
   */
  reconcile(
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>
  ): Record<string, unknown> {
    const root: Cursor = { source: sourceData, target: targetData ?? {}, sharedRow: true };
    return (
      (walkFields(this.schema, root, reconcileWalker) as Record<string, unknown> | undefined) ?? {}
    );
  }
}
