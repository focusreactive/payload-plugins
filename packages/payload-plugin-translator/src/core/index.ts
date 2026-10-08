export type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  TranslationIndex,
} from "./domain/translation-providers/index.js";

export { TranslationPipeline, translateContent } from "./translation-pipeline/index.js";
export type { TranslateContentArgs, TranslationStrategy } from "./translation-pipeline/index.js";

export type {
  ProvenanceKey,
  ProvenanceReceipt,
  ProvenanceStore,
  SourceFingerprint,
  TranslationProvenanceRecord,
} from "./domain/provenance/index.js";
export { parseSourceFingerprint } from "./domain/provenance/index.js";

export { projectTranslatableContent } from "./domain/content-projection/contentProjector.js";
export type { ProjectionEntry } from "./domain/content-projection/contentProjector.js";
export { fingerprint } from "./domain/content-projection/fingerprinter.js";
export { computeSourceFingerprint } from "./domain/content-projection/computeSourceFingerprint.js";
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
