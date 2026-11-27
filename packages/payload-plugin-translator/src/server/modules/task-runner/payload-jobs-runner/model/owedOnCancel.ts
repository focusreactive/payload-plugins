import type { PayloadJob } from "../store/index.js";

import { stillOwed } from "./stillOwed.js";

/**
 * Which of a run's locales stopping it still owes an answer about.
 *
 * Every locale the run has not delivered, including those of a run that has already given up. The
 * job is not asked whether those locales were settled: a run can be left open by a failure that
 * never reached the plugin, and then this is the last chance to close it — stopping deletes the
 * job rows, so an answer withheld here can never be given. Announcing one twice costs nothing,
 * because a record that has ended refuses a second ending.
 */
export const owedOnCancel = (job: PayloadJob, locales: readonly string[]): string[] =>
  stillOwed(job, locales);
