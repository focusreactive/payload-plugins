import type { Field } from "payload";

import { isTranslatableLeaf } from "../../../../shared/content-projection/translatableLeaf";
import type { ChildCursor, FieldWalker } from "../../../../shared/field-traversal";
import {
  matchElementById,
  resolveBlockFields,
  walkFields,
} from "../../../../shared/field-traversal";
import { isObject } from "../../../../shared/utils/isObject";
import type { TranslationStrategy } from "../../strategies";
import type { FieldChunk } from "../../types";

/** Data position for the collect walk: the three parallel trees plus the path from root. */
type Cursor = {
  data: Record<string, unknown>;
  source: Record<string, unknown>;
  target: Record<string, unknown>;
  path: string[];
};

const asObject = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});

/**
 * Collects FieldChunks by walking schema + data with the shared {@link walkFields} engine.
 * Iteration is driven by `filteredData`; each translatable, localized, non-excluded leaf that
 * the strategy approves is written with its source value and pushed as a chunk carrying a
 * mutable reference to its parent object (for later write-back). Collect-only — `combine` is a
 * no-op; results accumulate in a closure.
 *
 * Array/block elements pair their `source` by position (`filteredData` is built in source order)
 * but their `target` by `id` (see {@link matchElementById}) — the target locale's elements may be
 * independently ordered, so a positional target would feed `strategy.shouldTranslate` the wrong
 * element's value and skip/re-translate the wrong leaf.
 *
 * IMPORTANT: Expects ORIGINAL collection schemas (before Payload sanitization). Original
 * schemas preserve `localized: true` on nested fields.
 */
export class FieldChunkCollector {
  private readonly schema: Field[];
  private readonly filteredData: Record<string, unknown>;
  private readonly sourceData: Record<string, unknown>;
  private readonly targetData: Record<string, unknown>;
  private readonly strategy: TranslationStrategy;

  constructor(
    schema: Field[],
    filteredData: Record<string, unknown>,
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>,
    strategy: TranslationStrategy
  ) {
    this.schema = schema;
    this.filteredData = filteredData;
    this.sourceData = sourceData;
    this.targetData = targetData;
    this.strategy = strategy;
  }

  /** Collects translatable field chunks that need translation. */
  collect(): FieldChunk[] {
    // The read walk SELECTS translatable leaves (via the shared selection core) and records, per
    // selected leaf, the source value to translate plus its write target. The mutation is applied
    // in a separate explicit pass below — read and write are no longer fused inside the walk.
    const selected: { dataRef: Record<string, unknown>; key: string; sourceValue: unknown }[] = [];
    const chunks: FieldChunk[] = [];
    const { strategy } = this;

    const walker: FieldWalker<Cursor, unknown> = {
      enterObject(field, cursor) {
        const value = cursor.data[field.name];
        if (!isObject(value)) return "skip";
        return {
          data: value,
          source: asObject(cursor.source[field.name]),
          target: asObject(cursor.target[field.name]),
          path: [...cursor.path, field.name],
        };
      },

      enterList(field, cursor) {
        const value = cursor.data[field.name];
        if (!Array.isArray(value)) return "skip";
        const sourceValue = cursor.source[field.name];
        const targetValue = cursor.target[field.name];
        const sourceArr: unknown[] = Array.isArray(sourceValue) ? sourceValue : [];
        const targetArr: unknown[] = Array.isArray(targetValue) ? targetValue : [];
        const isBlocks = field.type === "blocks";

        const children: ChildCursor<Cursor>[] = [];
        value.forEach((item, index) => {
          if (!isObject(item)) return;
          const fields = isBlocks ? resolveBlockFields(field, item) : field.fields;
          if (!fields) return; // unknown blockType → skip element
          // source pairs by index (filteredData shares source order); target by the source
          // element's id, since the target locale may be reordered independently.
          const sourceItem = asObject(sourceArr[index]);
          children.push({
            cursor: {
              data: item,
              source: sourceItem,
              target: matchElementById(targetArr, sourceItem, isBlocks),
              path: [...cursor.path, field.name, String(index)],
            },
            fields,
            key: index,
          });
        });
        return children;
      },

      leaf(field, cursor) {
        const value = cursor.data[field.name];
        if (value === undefined || value === null) return undefined;

        const sourceValue = cursor.source[field.name];
        const targetValue = cursor.target[field.name];
        if (isTranslatableLeaf(field) && strategy.shouldTranslate({ sourceValue, targetValue })) {
          selected.push({ dataRef: cursor.data, key: field.name, sourceValue });
          chunks.push({
            schema: field,
            dataRef: cursor.data,
            key: field.name,
            path: [...cursor.path, field.name],
          });
        }
        return undefined;
      },

      combine() {
        return undefined; // collect-only — nothing to assemble
      },
    };

    walkFields(
      this.schema,
      { data: this.filteredData, source: this.sourceData, target: this.targetData, path: [] },
      walker
    );

    // Apply pass: write each selected leaf's source value into filteredData — this is what gets
    // translated. Kept separate from the read walk above so selection stays read-only.
    for (const { dataRef, key, sourceValue } of selected) {
      dataRef[key] = sourceValue;
    }

    return chunks;
  }
}
