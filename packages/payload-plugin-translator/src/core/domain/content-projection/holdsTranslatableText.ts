import type { LanguageTable } from "../../../traversal/index.js";

import type { SchemaLookup } from "./sourceFingerprinter.js";
import { translatableFields } from "./translatableFields.js";

export type TranslatableTextPresence = (
  collection: string,
  doc: Record<string, unknown>
) => boolean;

export const translatableTextPresence =
  (schemas: SchemaLookup, walk: LanguageTable): TranslatableTextPresence =>
  (collection, doc) => {
    const schema = schemas.get(collection);
    if (!schema) return false;
    return translatableFields(doc, schema, walk).length > 0;
  };
