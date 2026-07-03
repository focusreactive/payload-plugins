import type { LeafFieldLike } from "../../field-traversal/types";

/**
 * Represents a field-level chunk containing schema metadata.
 * Used in stages 1-3 where schema awareness is needed.
 *
 * Contains a reference to the parent data object for later mutation.
 */
export type FieldChunk = {
  /** The leaf field schema (only `type`/`name` are read downstream). */
  schema: LeafFieldLike;
  /** Reference to the parent data object (for mutation) */
  dataRef: Record<string, unknown>;
  /** The key in the dataRef object */
  key: string;
  /** Full path from root for strategy lookup in targetData */
  path: string[];
};
