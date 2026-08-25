// OpenAI translation provider — one vendor implementation, built as thin sugar over the shared
// factory. The `openai` SDK is reached only through `loadOpenAIClient`, and only on the `apiKey` path.
export { OpenAITranslationProvider, createOpenAIProvider } from "./OpenAITranslation.provider";
export type { OpenAIProviderConfig } from "./OpenAITranslation.provider";

export type {
  OpenAIChatMessage,
  OpenAIChatParams,
  OpenAIChatResult,
  OpenAIClientShape,
  OpenAIRequestOptions,
  OpenAIResponseFormat,
} from "./OpenAI.shapes";

export { openAIComplete } from "./openAIComplete";
export type { OpenAISamplingParams, OpenAIStructuredOutput } from "./openAIComplete";
