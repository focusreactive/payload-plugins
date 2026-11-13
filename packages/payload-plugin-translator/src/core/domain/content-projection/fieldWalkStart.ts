import { isObject } from "../../kernel/utils/isObject.js";
import type { FieldLike } from "../../kernel/field-traversal/types.js";

/**
 * What a walk over a Payload document is started from, named here rather than beside the language
 * that reads it because two of the three places that build one are core files, and core may not
 * import `src/languages`.
 *
 * `data` and `source` are the same object on the routes that read and write one document, and two
 * objects on the route that reads one and writes another. Which is which is stated on
 * `PayloadFieldsCursor`, where the walk carries them.
 */
export type FieldWalkStart = {
  fields: FieldLike[];
  data: Record<string, unknown>;
  source: Record<string, unknown>;
};

/**
 * Whether a value is one. `fields` is checked for being a list and no further — what a field must
 * look like is `FieldLike`'s own question — so a list holding anything at all passes here, and an
 * entry that is not an object throws where the walk reads it rather than being refused at entry.
 */
export const isFieldWalkStart = (value: unknown): value is FieldWalkStart => {
  return (
    isObject(value) && Array.isArray(value.fields) && isObject(value.data) && isObject(value.source)
  );
};
