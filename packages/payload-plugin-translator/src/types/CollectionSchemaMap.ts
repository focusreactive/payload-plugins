import type { CollectionSlug } from "payload";

import type { FieldLike } from "../core/kernel/field-traversal";

/**
 * Map of collection slug to its projected field schema — an independent {@link FieldLike} snapshot
 * taken (via `projectFieldsToFieldLike`) before Payload's sanitizer mutates the originals, so nested
 * `localized` flags survive. Typed as `FieldLike[]` (not Payload's `Field[]`) because every consumer
 * reads it structurally as `FieldLike`; the projection is the boundary that makes that explicit.
 */
export type CollectionSchemaMap = Map<CollectionSlug, FieldLike[]>;
