import type { PayloadJobsRunnerOptions } from "./types.js";

/**
 * How many retries the plugin configured, in the one form {@link isLastAttempt} compares against.
 *
 * Payload takes either a bare number or a config object and treats a missing `attempts` as none
 * (`payload/dist/queues/errors/handleTaskError.js:31-41`), so an unconfigured runner reports its
 * first failure as final.
 */
export const retryLimitOf = (retries: PayloadJobsRunnerOptions["retries"]): number =>
  typeof retries === "number" ? retries : (retries?.attempts ?? 0);
