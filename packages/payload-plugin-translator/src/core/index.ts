export type {
  TranslationProvider,
  TranslationRequest,
  TranslationFailureCode,
  TranslationInput,
  TranslationOutput,
  TranslationIndex,
} from "./domain/translation-providers/index.js";

export { TranslationPipeline, translateContent } from "./translation-pipeline/index.js";
export type { TranslateContentArgs } from "./translation-pipeline/index.js";

export type {
  ProvenanceKey,
  ProvenanceReceipt,
  ProvenanceStore,
  RecordedFingerprints,
  TranslationProvenanceRecord,
} from "./domain/provenance/index.js";
export { parseSourceFingerprint } from "./domain/provenance/index.js";

export { makeIdPath } from "./domain/content-projection/idPath.js";
export type { IdPath, PathSegment } from "./domain/content-projection/idPath.js";

export {
  classifyField,
  findFieldByPath,
  hasFields,
  isBlockItem,
  isTabsField,
  matchElementById,
  resolveBlockFields,
  tabScopes,
  walkFields,
} from "./kernel/field-traversal/index.js";

export type {
  ArrayFieldLike,
  BlockLike,
  BlocksFieldLike,
  FieldLike,
  FieldStructure,
  FieldWalker,
  GroupFieldLike,
  LeafField,
  LeafFieldLike,
  TabLike,
  TabScope,
  TabsFieldLike,
} from "./kernel/field-traversal/index.js";
