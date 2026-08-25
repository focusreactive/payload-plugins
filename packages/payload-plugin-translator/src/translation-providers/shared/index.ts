// Vendor-neutral half of the provider stack: a complete `TranslationProvider` built from one
// consumer-supplied request function, plus the failure taxonomy every built-in provider throws.
//
// The pure helpers behind it (prompt, schema, parsing, dry run) stay internal on purpose. Their only
// caller is the factory: anyone needing their own transport to a language model wants
// `createTranslationProvider`, and anyone whose service is not a language model has no use for a
// system prompt or a JSON schema. Exporting them later is easy; un-exporting them would not be.

export { createTranslationProvider } from "./CompletionProvider.provider";
export type {
  CompletionFn,
  CompletionRequest,
  TranslationProviderConfig,
} from "./CompletionProvider.provider";

export type { JsonSchemaObject } from "./buildResponseSchema";
export type { SystemPromptBuilder, SystemPromptContext } from "./buildSystemPrompt";
export type { DryRunConfig, DryRunTransformer } from "./runDryRun";

export {
  TranslationProviderError,
  NoContentError,
  UnparseableReplyError,
  KeySetMismatchError,
  TransportError,
  ProviderConfigurationError,
} from "./errors";
export type { TranslationFailureCode } from "./errors";
