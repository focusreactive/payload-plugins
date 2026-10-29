import { elementSegment, makeIdPath } from "../../../domain/content-projection/idPath.js";
import type { PathSegment } from "../../../domain/content-projection/idPath.js";
import { isTranslatableLeaf } from "../../../domain/content-projection/translatableLeaf.js";
import type { LeafAddress } from "../../../domain/content-projection/idPath.js";
import type { ChildCursor, FieldLike, FieldWalker } from "../../../kernel/field-traversal/index.js";
import { resolveBlockFields, walkFields } from "../../../kernel/field-traversal/index.js";
import { isEmpty } from "../../../kernel/utils/isEmpty.js";
import { isObject } from "../../../kernel/utils/isObject.js";
import type { FieldChunk } from "../../types/index.js";

type Cursor = {
  data: Record<string, unknown>;
  source: Record<string, unknown>;
  segments: PathSegment[];
};

const asObject = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});

/**
 * Collects the FieldChunks a run will send, walking `reconciledData` against the schema with the
 * shared {@link walkFields} engine. `collect()` seats each chosen leaf's source value into
 * `reconciledData` — an object value as a detached copy, because write-back mutates it in place and
 * would otherwise translate the caller's own source — and each chunk points at that parent.
 *
 * IMPORTANT: Expects ORIGINAL collection schemas (before Payload sanitization). Original
 * schemas preserve `localized: true` on nested fields.
 */
export class FieldChunkCollector {
  private readonly schema: FieldLike[];
  private readonly reconciledData: Record<string, unknown>;
  private readonly sourceData: Record<string, unknown>;
  private readonly selection: ReadonlySet<LeafAddress>;

  constructor(
    schema: FieldLike[],
    reconciledData: Record<string, unknown>,
    sourceData: Record<string, unknown>,
    selection: readonly LeafAddress[]
  ) {
    this.schema = schema;
    this.reconciledData = reconciledData;
    this.sourceData = sourceData;
    this.selection = new Set(selection);
  }

  collect(): FieldChunk[] {
    const selected: { dataRef: Record<string, unknown>; key: string; sourceValue: unknown }[] = [];
    const chunks: FieldChunk[] = [];
    const { selection } = this;

    const walker: FieldWalker<Cursor, unknown> = {
      enterObject(field, cursor) {
        const value = cursor.data[field.name];
        if (!isObject(value)) return "skip";
        return {
          data: value,
          source: asObject(cursor.source[field.name]),
          segments: [...cursor.segments, { kind: "key", name: field.name }],
        };
      },

      enterList(field, cursor) {
        const value = cursor.data[field.name];
        if (!Array.isArray(value)) return "skip";
        const sourceValue = cursor.source[field.name];
        const sourceArr: unknown[] = Array.isArray(sourceValue) ? sourceValue : [];
        const isBlocks = field.type === "blocks";

        const children: ChildCursor<Cursor>[] = [];
        value.forEach((item, index) => {
          if (!isObject(item)) return;
          const fields = isBlocks ? resolveBlockFields(field, item) : field.fields;
          if (!fields) return;

          const sourceItem = asObject(sourceArr[index]);
          children.push({
            cursor: {
              data: item,
              source: sourceItem,
              segments: [
                ...cursor.segments,
                { kind: "key", name: field.name },
                elementSegment(sourceItem, isBlocks, index),
              ],
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
        const idPath = makeIdPath([...cursor.segments, { kind: "key", name: field.name }]);
        if (isTranslatableLeaf(field) && selection.has(idPath) && !isEmpty(sourceValue)) {
          selected.push({ dataRef: cursor.data, key: field.name, sourceValue });
          chunks.push({
            schema: field,
            dataRef: cursor.data,
            key: field.name,
            idPath,
          });
        }
        return undefined;
      },

      combine() {
        return undefined;
      },
    };

    walkFields(
      this.schema,
      { data: this.reconciledData, source: this.sourceData, segments: [] },
      walker
    );

    for (const { dataRef, key, sourceValue } of selected) {
      dataRef[key] = isObject(sourceValue) ? structuredClone(sourceValue) : sourceValue;
    }

    return chunks;
  }
}
