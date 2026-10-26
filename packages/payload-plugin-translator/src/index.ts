// Main plugin
export { translatorPlugin } from "./plugin.js";
export type { TranslatorPluginConfig } from "./plugin.js";
export type { TargetSelectionMode } from "./types/TargetSelection.js";

// Lifecycle callbacks — the task descriptor passed to onQueued/onCompleted/onFailed
export type {
  TranslationTask,
  TranslationLifecycleCallbacks,
} from "./server/modules/lifecycle/index.js";

export type { TranslationProvenanceRecord } from "./core/index.js";

// Access control
export type { AccessGuard, AccessGuardRequest } from "./types/AccessGuard.js";
export type { TranslatorAction } from "./types/TranslatorAction.js";
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
/**
 * A third-party `TaskRunnerProvider` has always had to accept a `RequestScope` — it is the second
 * parameter of `TaskRunner.enqueue` and of the `TaskHandler` it is handed — but could not name the
 * type. Exported so an implementation outside this package can.
 *
 * @since 0.14.0
 */
export type { RequestScope, Requester } from "./server/shared/payload/RequestScope.shapes.js";

export { documentTranslation, fieldTranslation } from "./composition/modules/index.js";
export {
  bulkTranslationDashboard,
  translateDocumentControl,
} from "./composition/components/index.js";

// Field config
export { withFieldTranslation } from "./field-config.js";
export type { FieldTranslationConfig } from "./field-config.js";

// Auto-translate — opt-in, per-collection auto-translation on source-locale change (#51). Wrap a
// collection with `withAutoTranslate`; requires a working job runner/autorun to execute (see the
// JSDoc for the Vercel/serverless caveat). Since v0.9.0.
export { withAutoTranslate } from "./auto-translate-config.js";
export type { AutoTranslateConfig } from "./auto-translate-config.js";

export { createOpenAIProvider, OpenAITranslationProvider } from "./translation-providers/index.js";
export type { OpenAIProviderConfig } from "./translation-providers/index.js";
