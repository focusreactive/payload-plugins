import type { IdPath } from "../../domain/content-projection/idPath.js";
import type { LeafFieldLike } from "../../kernel/field-traversal/types.js";

export type FieldChunk = {
  /** The leaf field schema (only `type`/`name` are read downstream). */
  schema: LeafFieldLike;
  /** Reference to the parent data object (for mutation) */
  dataRef: Record<string, unknown>;
  key: string;
  /** The leaf's {@link IdPath} — the same address a provenance receipt is keyed on. */
  idPath: IdPath;
};
