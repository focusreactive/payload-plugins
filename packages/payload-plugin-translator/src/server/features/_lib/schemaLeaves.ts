import type { CollectionSlug } from "payload";

import { isTranslatableLeaf } from "../../../core/domain/content-projection/translatableLeaf.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { dataPath, inlineBlocks, walkSchema } from "../../../core/kernel/field-traversal/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";

/** A leaf of the schema, with the name path the presentation index is keyed by. */
export type SchemaLeaf = { field: FieldLike; path: readonly string[] };

export function schemaLeaves(schema: readonly FieldLike[]): SchemaLeaf[] {
  const found: SchemaLeaf[] = [];
  walkSchema(schema, {
    blocksOf: inlineBlocks,
    visit: (node) => {
      if (node.kind === "leaf") found.push({ field: node.field, path: node.path });
    },
  });
  return found;
}

export function translatableFieldPaths(schema: readonly FieldLike[]): string[] {
  const paths = schemaLeaves(schema)
    .filter((leaf) => isTranslatableLeaf(leaf.field))
    .map((leaf) => dataPath(leaf.path).join("."));
  return [...new Set(paths)];
}

/**
 * Where a collection's translatable text may sit: the data paths a query names, by slug.
 */
export type TranslatablePaths = (collection: CollectionSlug) => readonly string[];

/**
 * A Payload config cannot change while the process runs, so each collection is walked once.
 */
export function translatablePathsIn(schemaMap: CollectionSchemaMap): TranslatablePaths {
  const walked = new Map<CollectionSlug, readonly string[]>();
  return (collection) => {
    const known = walked.get(collection);
    if (known) return known;
    const paths = translatableFieldPaths(schemaMap.get(collection) ?? []);
    walked.set(collection, paths);
    return paths;
  };
}
