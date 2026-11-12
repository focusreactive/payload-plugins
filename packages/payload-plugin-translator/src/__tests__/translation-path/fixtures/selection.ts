import { translatableFields } from "../../../core/domain/content-projection/translatableFields.js";
import { translationLanguages } from "../../../server/features/_lib/index.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import type { IdPath } from "../../../core/domain/content-projection/idPath.js";

export const everySelectableAddress = (
  doc: Record<string, unknown>,
  schema: FieldLike[]
): IdPath[] =>
  translatableFields(doc, schema, translationLanguages()).map((field) => field.address);
