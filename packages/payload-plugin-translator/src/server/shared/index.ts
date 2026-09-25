// HTTP utilities
export {
  ServerResponse,
  withErrorHandler,
  withAccessCheck,
  toClientErrorMessage,
  GENERIC_TRANSLATION_ERROR,
} from "./http/index.js";

// Access control
export { AnyAccessGuard } from "./access/index.js";
export type { AccessGuard, AccessGuardRequest, Handler } from "./access/index.js";

// General utilities
export {
  isEmpty,
  isObject,
  normalizePath,
  pipe,
  getByPath,
  setByPath,
  filterLocalizedFields,
} from "./utils/index.js";

// Field guards
export type { TranslatableField } from "./guards/index.js";
export { isTranslatableField, isLocalizedField, isRelationshipField } from "./guards/index.js";
export { isTabsField, isBlockItem, hasFields } from "../../core/kernel/field-traversal/index.js";

// Field config
export {
  isFieldExcludedFromTranslation,
  getTranslateKitFieldConfig,
} from "../../core/domain/field-config/index.js";
export type { TranslateKitFieldConfig } from "../../core/domain/field-config/index.js";

// Lexical utilities
export {
  isSerializedLexicalRoot,
  isEmptyRichText,
  traverseLexicalTree,
  collectSerializedLexicalTextNodes,
} from "../../core/kernel/lexical/index.js";
export type { SerializedTextNodeRef } from "../../core/kernel/lexical/index.js";

// Validation primitives
export { JobIdSchema } from "./validation/index.js";
