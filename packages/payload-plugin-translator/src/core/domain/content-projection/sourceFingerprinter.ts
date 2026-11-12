import type { FieldLike } from "../../kernel/field-traversal/types.js";
import type { LanguageTable } from "../../traversal/index.js";
import { fingerprintFieldContents } from "./computeFieldFingerprints.js";
import type { FieldFingerprints } from "./computeFieldFingerprints.js";
import { translatableFields } from "./translatableFields.js";

export type SchemaLookup = { get(collection: string): FieldLike[] | undefined };

/**
 * What a source document hashes to — `null` when this collection is not translated here.
 */
export type SourceFingerprinter = (
  collection: string,
  doc: Record<string, unknown>
) => FieldFingerprints | null;

export const sourceFingerprinter =
  (schemas: SchemaLookup, walk: LanguageTable): SourceFingerprinter =>
  (collection, doc) => {
    const schema = schemas.get(collection);
    if (!schema) return null;
    return fingerprintFieldContents(translatableFields(doc, schema, walk));
  };
