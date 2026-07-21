/**
 * `projectTranslatableContent` — the pure, read-only `ContentProjector` (slice 6 design,
 * `docs/plans/2026-06-30-slice6-contentprojector-idpath-design.md`).
 *
 * Produces one `{ idPath, text }` entry per translatable leaf of a document — the projection the
 * provenance fingerprint (#47) hashes. It reuses the SAME traversal engine ({@link walkFields}),
 * the SAME leaf-selection predicate + text notion ({@link isTranslatableLeaf} /
 * {@link leafSourceText}) as the translation pipeline's `FieldChunkCollector`, so projection and
 * translation can never disagree on which content is translatable. Payload-free and read-only:
 * it never mutates the document and never captures write handles.
 */

import type { ChildCursor, FieldWalker } from "../kernel/field-traversal";
import { resolveBlockFields, walkFields } from "../kernel/field-traversal";
import type { FieldLike } from "../kernel/field-traversal/types";
import { isObject } from "../kernel/utils/isObject";
import type { IdPath, PathSegment } from "./idPath";
import { elementSegment, makeIdPath } from "./idPath";
import { isTranslatableLeaf, leafSourceText } from "./translatableLeaf";

/** One translatable leaf of a document: WHERE it lives ({@link IdPath}) and WHAT text it holds. */
export interface ProjectionEntry {
  idPath: IdPath;
  text: string;
}

/** The walk position: the current data object plus the accumulated location segments. */
type Cursor = {
  data: Record<string, unknown>;
  segments: PathSegment[];
};

/**
 * Project a document's translatable content into a flat, location-keyed list.
 *
 * @param doc - The source document to read (never mutated).
 * @param schema - The ORIGINAL (un-sanitized) field schema — preserves nested `localized` flags.
 * @returns One entry per translatable, localized, non-excluded leaf that holds text, in traversal
 * order. `richText` is field-level (one entry, joined node text). Reordering array/blocks elements
 * does not change the set (each entry's `idPath` is keyed by element `id`, not index).
 */
export function projectTranslatableContent(
  doc: Record<string, unknown>,
  schema: FieldLike[]
): ProjectionEntry[] {
  const entries: ProjectionEntry[] = [];

  const walker: FieldWalker<Cursor, unknown> = {
    enterObject(field, cursor) {
      const value = cursor.data[field.name];
      if (!isObject(value)) return "skip";
      return { data: value, segments: [...cursor.segments, { kind: "key", name: field.name }] };
    },

    enterList(field, cursor) {
      const value = cursor.data[field.name];
      if (!Array.isArray(value)) return "skip";
      const isBlocks = field.type === "blocks";
      const listSegments: PathSegment[] = [...cursor.segments, { kind: "key", name: field.name }];

      const children: ChildCursor<Cursor>[] = [];
      value.forEach((item, index) => {
        if (!isObject(item)) return;
        const fields = isBlocks ? resolveBlockFields(field, item) : field.fields;
        if (!fields) return; // unknown blockType → skip element
        children.push({
          cursor: {
            data: item,
            segments: [...listSegments, elementSegment(item, isBlocks, index)],
          },
          fields,
          key: index,
        });
      });
      return children;
    },

    leaf(field, cursor) {
      if (!isTranslatableLeaf(field)) return undefined;
      const text = leafSourceText(field, cursor.data[field.name]);
      if (text === null) return undefined;
      entries.push({
        idPath: makeIdPath([...cursor.segments, { kind: "key", name: field.name }]),
        text,
      });
      return undefined;
    },

    combine() {
      return undefined; // collect-only — nothing to assemble
    },
  };

  walkFields(schema, { data: doc, segments: [] }, walker);

  return entries;
}
