import { TraversalError } from "./TraversalError.js";
import type { IdPath } from "../contract.js";
import { renderIdPath } from "./renderIdPath.js";

/**
 * A node that contains itself.
 *
 * Distinct from {@link TooManyCrossingsError}: a cycle inside one language performs no crossings at
 * all, so no cap can see it. The walk compares the node **and** the position it is read at, because
 * a language whose schema sits beside its data legitimately walks one schema node once per element.
 *
 * @public
 */
export class TraversalCycleError extends TraversalError {
  /** The position the repeat was found at. */
  readonly idPath: IdPath;

  constructor(idPath: IdPath) {
    super(`a node contains itself at ${renderIdPath(idPath)}`);
    this.name = "TraversalCycleError";
    this.idPath = idPath;
  }
}
