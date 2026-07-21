// The translation PORT (contract) only. The OpenAI implementation lives in
// src/providers (outside core) so the core barrel stays dependency-free (no `openai`).
export type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  TranslationIndex,
} from "./TranslationProvider.interface";
