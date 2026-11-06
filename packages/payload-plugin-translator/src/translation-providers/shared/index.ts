export { createTranslationProvider } from "./AskModel.provider.js";
export type { AskModel, ModelRequest, TranslationProviderConfig } from "./AskModel.provider.js";

export type { JsonSchemaObject } from "./buildResponseSchema.js";
export {
  inlineMarksInstruction,
  canEncodeSegments,
  decodeSegments,
  encodeSegments,
} from "./wire/index.js";
export type { SystemPromptBuilder, SystemPromptContext } from "./buildSystemPrompt.js";

export { errorMessageLower } from "./errors/index.js";
export {
  TranslationProviderError,
  NoContentError,
  UnparseableReplyError,
  KeySetMismatchError,
  TransportError,
  ProviderConfigurationError,
} from "./errors/index.js";
export type { TranslationFailureCode } from "./errors/index.js";
