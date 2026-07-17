// Main plugin
export { translatorPlugin } from "./plugin";
export type { TranslatorPluginConfig } from "./plugin";

// Lifecycle callbacks — the task descriptor passed to onQueued/onCompleted/onFailed
export type { TranslationTask, TranslationLifecycleCallbacks } from "./server/modules/lifecycle";

// Provenance — the durable per-locale record shape (opt-in `provenance` sidecar). The store/key and
// the Payload-backed impl stay internal; consumers only read the sidecar collection.
export type { TranslationProvenanceRecord } from "./core";

// Access control
export type { AccessGuard, AccessGuardRequest } from "./types/AccessGuard";

// Translation provider port (from the dependency-free core)
export type { TranslationProvider, TranslationInput, TranslationOutput } from "./core";
// Built-in OpenAI provider (opt-in; pulls `openai`) — lives in the plugin's src/providers, outside core
export { createOpenAIProvider } from "./translation-providers";
export type { OpenAIProviderConfig, DryRunConfig } from "./translation-providers";

// Task runners
export { createPayloadJobsRunner, createSyncRunner } from "./server/modules/task-runner";
export type { TaskRunnerProvider, PayloadJobsRunnerOptions } from "./server/modules/task-runner";

// Translation levels
export { documentLevel, collectionLevel, fieldLevel } from "./composition/levels";
export type { TranslationLevel } from "./server/modules/translation-levels";

// Field config
export { withFieldTranslation } from "./field-config";
export type { FieldTranslationConfig } from "./field-config";

// Auto-translate — opt-in, per-collection auto-translation on source-locale change (#51). Wrap a
// collection with `withAutoTranslate`; requires a working job runner/autorun to execute (see the
// JSDoc for the Vercel/serverless caveat). Since v0.9.0.
export { withAutoTranslate } from "./auto-translate-config";
export type { AutoTranslateConfig, AutoTranslateStrategy } from "./auto-translate-config";

// Deprecated exports (for backwards compatibility)
export { createTranslatePlugin, TranslateCollectionPlugin } from "./plugin";
export type { TranslateCollectionPluginConfig } from "./plugin";
export { OpenAITranslationProvider } from "./translation-providers";
export { translateKitField } from "./field-config";
export type { TranslateKitFieldConfig } from "./field-config";
