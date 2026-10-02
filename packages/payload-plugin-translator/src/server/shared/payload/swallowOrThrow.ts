import { mustPropagate } from "../../../core/errors/index.js";

import type { RequestScope } from "./RequestScope.shapes.js";

/**
 * Swallows a failure from `work` — it goes to `onFailure` and the caller gets `undefined`, which is
 * the only meaning `undefined` has here. It throws instead when the failure may have taken the
 * caller's own transaction with it: both that the caller is inside one, and that the error does not
 * declare itself harmless.
 *
 * `scope` is read before `work` runs; mutating it during the work has no effect.
 */
export async function swallowOrThrow<T>(
  scope: RequestScope,
  work: () => Promise<T>,
  onFailure: (error: unknown) => void
): Promise<T | undefined> {
  const callerHasWorkToLose = scope.transactionID != null;

  try {
    return await work();
  } catch (error) {
    onFailure(error);
    if (callerHasWorkToLose && mustPropagate(error)) throw error;
    return undefined;
  }
}
