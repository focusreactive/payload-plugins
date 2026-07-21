// Framework-agnostic translator core. No payload / @payloadcms / next / react.
// The plugin (adapter) re-exports the public bits from here.

// Translation provider PORT (contract) only — dependency-free. The built-in OpenAI
// implementation lives in the plugin src/providers (outside core) so this barrel never pulls `openai`.
export type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  TranslationIndex,
} from "./domain/translation-providers";

// Translation pipeline
export { TranslationPipeline, translateContent } from "./translation-pipeline";
export type { TranslateContentArgs, TranslationStrategy } from "./translation-pipeline";

// Provenance (contracts only — payload-free port + record types)
export type {
  ProvenanceKey,
  ProvenanceStore,
  TranslationProvenanceRecord,
} from "./domain/provenance";

// Content projection
export { projectTranslatableContent } from "./domain/content-projection/contentProjector";
export type { ProjectionEntry } from "./domain/content-projection/contentProjector";
export { fingerprint } from "./domain/content-projection/fingerprinter";
export { computeSourceFingerprint } from "./domain/content-projection/computeSourceFingerprint";
export { makeIdPath } from "./domain/content-projection/idPath";
export type { IdPath, PathSegment } from "./domain/content-projection/idPath";

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
} from "./kernel/field-traversal";
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
} from "./kernel/field-traversal";
