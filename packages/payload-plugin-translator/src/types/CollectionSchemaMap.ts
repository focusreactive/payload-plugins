import type { CollectionSlug, Field } from "payload";

/**
 * Map of collection slug to original field schema.
 * Used to access original schemas before Payload sanitization.
 */
export type CollectionSchemaMap = Map<CollectionSlug, Field[]>;
