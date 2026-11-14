import { attemptsBefore } from "./attemptsBefore.js";

/**
 * Whether the attempt that just threw was the run's last for this locale: `attempts: 3` executes a
 * locale four times, so the limit is reached at `>=` ({@link attemptsBefore}).
 */
export type IsLastAttempt = (tried: { totalTried?: unknown } | undefined, limit: number) => boolean;

export const isLastAttempt: IsLastAttempt = (tried, limit) => {
  return attemptsBefore(tried) >= limit;
};
