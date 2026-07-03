// OpenAI translation provider — one vendor implementation of the core `TranslationProvider`
// port. Payload-free; pulls the `openai` SDK (opt-in).
export {
  OpenAITranslationProvider,
  createOpenAIProvider,
  type OpenAIProviderConfig,
  type DryRunConfig,
  type SystemPromptContext,
} from "./OpenAITranslation.provider";
