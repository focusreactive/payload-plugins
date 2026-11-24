import type { CollectionSlug } from "payload";

import { isTranslatableLeaf } from "../../../core/domain/content-projection/translatableLeaf.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { inlineBlocks, walkSchema } from "../../../core/kernel/field-traversal/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";

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

export type CollectionCanHoldText = (collection: CollectionSlug) => boolean;

export function collectionsThatCanHoldText(schemaMap: CollectionSchemaMap): CollectionCanHoldText {
  const walked = new Map<CollectionSlug, boolean>();
  return (collection) => {
    const known = walked.get(collection);
    if (known !== undefined) return known;
    const can = schemaLeaves(schemaMap.get(collection) ?? []).some((leaf) =>
      isTranslatableLeaf(leaf.field)
    );
    walked.set(collection, can);
    return can;
  };
}
