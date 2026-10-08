/**
 * What the plugin's own handler threw, kept until the run's loop can report it.
 *
 * Payload reads `message` off a task's error and throws a `TaskError` of its own
 * (`getRunTaskFunction.js:83`), so the plugin's error object — and the exported error classes a host
 * matches on — is gone by the time the loop catches anything.
 *
 * Keyed by the job row, which Payload passes by reference to both the task handler and the loop.
 */
const byRun = new WeakMap<object, unknown>();

export const rememberThrown = (run: object, error: unknown): void => {
  byRun.set(run, error);
};

export const theHandlerThrew = (run: object): boolean => byRun.has(run);

export const recallThrown = (run: object, fallback: unknown): unknown =>
  byRun.has(run) ? byRun.get(run) : fallback;
