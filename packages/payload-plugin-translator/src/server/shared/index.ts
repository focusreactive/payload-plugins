// HTTP utilities
export {
  ServerResponse,
  withErrorHandler,
  withAccessCheck,
  toClientErrorMessage,
  GENERIC_TRANSLATION_ERROR,
} from "./http";

// Access control
export { AnyAccessGuard } from "./access";
export type { AccessGuard, AccessGuardRequest, Handler } from "./access";

// General utilities
export {
  isEmpty,
  isObject,
  normalizePath,
  pipe,
  getByPath,
  setByPath,
  filterLocalizedFields,
} from "./utils";

// Field guards
export type { TranslatableField } from "./guards";
export { isTranslatableField, isLocalizedField, isRelationshipField } from "./guards";
export { isTabsField, isBlockItem, hasFields } from "../../core/kernel/field-traversal";

// Field config
export {
  isFieldExcludedFromTranslation,
  getTranslateKitFieldConfig,
} from "../../core/domain/field-config";
export type { TranslateKitFieldConfig } from "../../core/domain/field-config";

// Lexical utilities
export {
  isSerializedLexicalRoot,
  isEmptyRichText,
  traverseLexicalTree,
  collectSerializedLexicalTextNodes,
} from "../../core/kernel/lexical";
export type { SerializedTextNodeRef } from "../../core/kernel/lexical";

// Validation primitives
export { JobIdSchema } from "./validation";
