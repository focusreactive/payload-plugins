// Framework-agnostic translator core. No payload / @payloadcms / next / react.
// The plugin (adapter) re-exports the public bits from here.

// Translation provider PORT (contract) only — dependency-free. The built-in OpenAI
// implementation lives in the plugin src/providers (outside core) so this barrel never pulls `openai`.
export type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  TranslationIndex,
} from "./domain/translation-providers/index.js";

// Translation pipeline
export { TranslationPipeline, translateContent } from "./translation-pipeline/index.js";
export type { TranslateContentArgs, TranslationStrategy } from "./translation-pipeline/index.js";

// Provenance (contracts only — payload-free port + record types)
export type {
  ProvenanceKey,
  ProvenanceStore,
  TranslationProvenanceRecord,
} from "./domain/provenance/index.js";

// Content projection
export { projectTranslatableContent } from "./domain/content-projection/contentProjector.js";
export type { ProjectionEntry } from "./domain/content-projection/contentProjector.js";
export { fingerprint } from "./domain/content-projection/fingerprinter.js";
export { computeSourceFingerprint } from "./domain/content-projection/computeSourceFingerprint.js";
export { makeIdPath } from "./domain/content-projection/idPath.js";
export type { IdPath, PathSegment } from "./domain/content-projection/idPath.js";

// Field traversal
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
