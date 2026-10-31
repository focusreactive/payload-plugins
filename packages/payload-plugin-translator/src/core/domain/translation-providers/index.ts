// The translation PORT (contract) only. The implementation lives in src/translation-providers
// (outside core) so the core barrel stays dependency-free (no `openai`).
export type {
  TranslationProvider,
  DocumentRef,
  TranslationRequest,
  TranslationFailureCode,
  TranslationInput,
  TranslationOutput,
  TranslationIndex,
  TranslatableValue,
  TranslatedValue,
  Segment,
  SegmentId,
  ValueFailureCode,
} from "./TranslationProvider.interface.js";
