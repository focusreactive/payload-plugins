import { TraversalError } from "./TraversalError.js";
/**
 * Two languages registered under one id.
 *
 * Raised before anything is walked, because a crossing naming that id could not say which of the
 * two it meant.
 *
 * @public
 */
export class DuplicateLanguageError extends TraversalError {
  /** The id that appeared more than once. */
  readonly languageId: string;

  constructor(languageId: string) {
    super(`traversal language "${languageId}" is registered more than once`);
    this.name = "DuplicateLanguageError";
    this.languageId = languageId;
  }
}
