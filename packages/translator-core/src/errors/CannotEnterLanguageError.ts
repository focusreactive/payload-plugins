import type { IdPath } from "../contract.js";
import { renderIdPath } from "./renderIdPath.js";

/**
 * A language could not be entered with the context it was handed.
 *
 * Raised both when `enter` returned `null` and when it threw; a throw is carried on `cause`.
 *
 * @public
 */
export class CannotEnterLanguageError extends Error {
  /** The language that refused the context or broke on it. */
  readonly languageId: string;
  /** Where the crossing was made; empty when it was the walk's own entry. */
  readonly idPath: IdPath;

  constructor(languageId: string, idPath: IdPath, cause?: unknown) {
    super(
      `language "${languageId}" could not be entered with the context handed to it at ${renderIdPath(idPath)}`,
      // Only when there was one: an options bag carrying `cause: undefined` still installs the
      // property, which would make every refusal look like it had wrapped a throw.
      cause === undefined ? undefined : { cause }
    );
    this.name = "CannotEnterLanguageError";
    this.languageId = languageId;
    this.idPath = idPath;
  }
}
