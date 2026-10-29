// The translation PORT (contract) only. The implementation lives in src/translation-providers
// (outside core) so the core barrel stays dependency-free (no `openai`).
export type {
  TranslationProvider,
  DocumentRef,
  TranslationRequestOptions,
  TranslationInput,
  TranslationOutput,
  TranslationIndex,
} from "./TranslationProvider.interface.js";
