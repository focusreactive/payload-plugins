import { sourceFingerprinter } from "../../../../../core/domain/content-projection/sourceFingerprinter.js";
import type {
  SchemaLookup,
  SourceFingerprinter,
} from "../../../../../core/domain/content-projection/sourceFingerprinter.js";
import { translationLanguages } from "../../../../features/_lib/index.js";

export const fingerprintsOf = (schemas: SchemaLookup): SourceFingerprinter =>
  sourceFingerprinter(schemas, translationLanguages());
