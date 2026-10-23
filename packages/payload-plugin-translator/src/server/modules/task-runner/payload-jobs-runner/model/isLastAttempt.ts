import { attemptsBefore } from "./attemptsBefore.js";

/**
 * Whether the attempt that just threw was the run's last for this locale.
 *
 * Payload counts the attempts *before* the current one, so `attempts: 3` executes a locale four
 * times (`payload/dist/queues/errors/handleTaskError.js:54`).
 */
export type IsLastAttempt = (tried: { totalTried?: unknown } | undefined, limit: number) => boolean;

export const isLastAttempt: IsLastAttempt = (tried, limit) => {
  return attemptsBefore(tried) >= limit;
};
