import type { Field } from "payload";

import { isFieldExcludedFromTranslation, isLocalizedField, isObject, isTranslatableField } from "../../../../shared";
import type { ChildCursor, FieldWalker } from "../../../../shared/field-traversal";
import { resolveBlockFields, walkFields } from "../../../../shared/field-traversal";
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
 * IMPORTANT: Expects ORIGINAL collection schemas (before Payload sanitization). Original
 * schemas preserve `localized: true` on nested fields.
 */
export class FieldChunkCollector {
  private readonly schema: Field[];
  private readonly filteredData: Record<string, unknown>;
  private readonly sourceData: Record<string, unknown>;
  private readonly targetData: Record<string, unknown>;
  private readonly strategy: TranslationStrategy;

  constructor(schema: Field[], filteredData: Record<string, unknown>, sourceData: Record<string, unknown>, targetData: Record<string, unknown>, strategy: TranslationStrategy) {
    this.schema = schema;
    this.filteredData = filteredData;
    this.sourceData = sourceData;
    this.targetData = targetData;
    this.strategy = strategy;
  }

  /** Collects translatable field chunks that need translation. */
  collect(): FieldChunk[] {
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

        const children: ChildCursor<Cursor>[] = [];
        value.forEach((item, index) => {
          if (!isObject(item)) return;
          const fields = field.type === "blocks" ? resolveBlockFields(field, item) : field.fields;
          if (!fields) return; // unknown blockType → skip element
          children.push({
            cursor: {
              data: item,
              source: asObject(sourceArr[index]),
              target: asObject(targetArr[index]),
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
        if (isTranslatableField(field) && isLocalizedField(field) && !isFieldExcludedFromTranslation(field) && strategy.shouldTranslate({ sourceValue, targetValue })) {
          cursor.data[field.name] = sourceValue; // write source value into filteredData — this is what gets translated
          chunks.push({ schema: field, dataRef: cursor.data, key: field.name, path: [...cursor.path, field.name] });
        }
        return undefined;
      },

      combine() {
        return undefined; // collect-only — nothing to assemble
      },
    };

    walkFields(this.schema, { data: this.filteredData, source: this.sourceData, target: this.targetData, path: [] }, walker);

    return chunks;
  }
}
