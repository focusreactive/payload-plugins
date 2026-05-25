// Main plugin
export { translatorPlugin } from './plugin'
export type { TranslatorPluginConfig } from './plugin'

// Access control
export type { AccessGuard, AccessGuardRequest } from './types/AccessGuard'

// Translation providers
export { createOpenAIProvider } from './server/modules/translation-providers'
export type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  OpenAIProviderConfig,
  DryRunConfig,
} from './server/modules/translation-providers'

// Task runners
export { createPayloadJobsRunner, createSyncRunner } from './server/modules/task-runner'
export type { TaskRunnerProvider, PayloadJobsRunnerOptions } from './server/modules/task-runner'

// Field config
export { withFieldTranslation } from './field-config'
export type { FieldTranslationConfig } from './field-config'

// Deprecated exports (for backwards compatibility)
export { createTranslatePlugin, TranslateCollectionPlugin } from './plugin'
export type { TranslateCollectionPluginConfig } from './plugin'
export { OpenAITranslationProvider } from './server/modules/translation-providers'
export { translateKitField } from './field-config'
export type { TranslateKitFieldConfig } from './field-config'
