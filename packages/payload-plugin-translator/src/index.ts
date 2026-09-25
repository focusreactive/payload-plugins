// Main plugin
export { translatorPlugin } from "./plugin.js";
export type { TranslatorPluginConfig } from "./plugin.js";
export type { TargetSelectionMode } from "./types/TargetSelection.js";

// Lifecycle callbacks — the task descriptor passed to onQueued/onCompleted/onFailed
export type {
  TranslationTask,
  TranslationLifecycleCallbacks,
} from "./server/modules/lifecycle/index.js";

// Provenance — the durable per-locale record shape (opt-in `provenance` sidecar). The store/key and
// the Payload-backed impl stay internal; consumers only read the sidecar collection.
export type { TranslationProvenanceRecord } from "./core/index.js";

// Access control
export type { AccessGuard, AccessGuardRequest } from "./types/AccessGuard.js";
export { AnyAccessGuard } from "./server/shared/access/AnyAccessGuard.js";

// Translation provider port (from the dependency-free core)
export type { TranslationProvider, TranslationInput, TranslationOutput } from "./core/index.js";

export { openAIComplete } from "./translation-providers/index.js";
export type {
  OpenAIClientShape,
  OpenAISamplingParams,
  OpenAIStructuredOutput,
  DryRunConfig,
} from "./translation-providers/index.js";

export { createTranslationProvider } from "./translation-providers/index.js";
export type {
  CompletionFn,
  CompletionRequest,
  TranslationProviderConfig,
  JsonSchemaObject,
  SystemPromptBuilder,
  SystemPromptContext,
} from "./translation-providers/index.js";

export {
  TranslationProviderError,
  NoContentError,
  UnparseableReplyError,
  KeySetMismatchError,
  TransportError,
  ProviderConfigurationError,
} from "./translation-providers/index.js";
export type { TranslationFailureCode } from "./translation-providers/index.js";

// Task runners
export {
  createPayloadJobsRunner,
  createSyncRunner,
  toTaskFilter,
} from "./server/modules/task-runner/index.js";
export type {
  TaskRunnerProvider,
  PayloadJobsRunnerOptions,
  TaskFilter,
} from "./server/modules/task-runner/index.js";

// Translation levels
export { documentLevel, collectionLevel, fieldLevel } from "./composition/levels/index.js";
export type { TranslationLevel } from "./server/modules/translation-levels/index.js";

// Field config
export { withFieldTranslation } from "./field-config.js";
export type { FieldTranslationConfig } from "./field-config.js";

// Auto-translate — opt-in, per-collection auto-translation on source-locale change (#51). Wrap a
// collection with `withAutoTranslate`; requires a working job runner/autorun to execute (see the
// JSDoc for the Vercel/serverless caveat). Since v0.9.0.
export { withAutoTranslate } from "./auto-translate-config.js";
export type { AutoTranslateConfig, AutoTranslateStrategy } from "./auto-translate-config.js";

// Deprecated exports (for backwards compatibility)
export { createTranslatePlugin, TranslateCollectionPlugin } from "./plugin.js";
export type { TranslateCollectionPluginConfig } from "./plugin.js";
export { createOpenAIProvider, OpenAITranslationProvider } from "./translation-providers/index.js";
export type { OpenAIProviderConfig } from "./translation-providers/index.js";
export { translateKitField } from "./field-config.js";
export type { TranslateKitFieldConfig } from "./field-config.js";
