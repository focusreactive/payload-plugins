import type { IdPath } from "../contract.js";
import { renderIdPath } from "./renderIdPath.js";

/**
 * Content handed from one language to another more times than the walk allows.
 *
 * Counts **crossings, not tree depth**: `schema → rich text → schema` is two. Raise `maxCrossings`
 * if the content is legitimately that deep; a structure that is genuinely endless raises
 * {@link TraversalCycleError} instead.
 *
 * @public
 */
export class TooManyCrossingsError extends Error {
  /** The position the walk had reached when it stopped. */
  readonly idPath: IdPath;
  /** The cap that was in force. */
  readonly maxCrossings: number;

  constructor(idPath: IdPath, maxCrossings: number) {
    super(`more than ${maxCrossings} language crossings at ${renderIdPath(idPath)}`);
    this.name = "TooManyCrossingsError";
    this.idPath = idPath;
    this.maxCrossings = maxCrossings;
  }
}
