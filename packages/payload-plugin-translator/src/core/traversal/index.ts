export type {
  CollectedContent,
  Crossing,
  IdPath,
  Language,
  PathSegment,
  RegisteredLanguage,
  Step,
  StepChild,
  TextLeaf,
  TextUnit,
  TranslationAnswer,
  UnitPiece,
  TranslationTarget,
} from "./contract.js";

export { applyTranslations, collectTranslationTargets } from "./collect.js";
export type { CollectOptions, LanguageTable } from "./collect.js";

export {
  CannotEnterLanguageError,
  DuplicateLanguageError,
  TooManyCrossingsError,
  TraversalError,
  TraversalCycleError,
  UnknownLanguageError,
} from "./errors/index.js";
