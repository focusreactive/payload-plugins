/**
 * The conformance suite a `TaskRunner` implementation runs against itself.
 *
 * Published as its own entry point because `TaskRunner.interface.ts` tells a runner author to call
 * it, and a suite living in `__tests__` ships with nothing — the promise could not be kept. It
 * imports `vitest`, which the package declares as an optional peer for that reason.
 */
export { assertTaskRunnerContract } from "./TaskRunner.invariants.js";
export type { MakeTaskRunner } from "./TaskRunner.invariants.js";
