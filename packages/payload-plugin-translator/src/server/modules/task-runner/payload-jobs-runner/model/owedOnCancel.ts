import type { PayloadJob } from "../store/index.js";

import { stillOwed } from "./stillOwed.js";

/**
 * Which of a run's locales stopping it still owes an answer about.
 *
 * A run that has given up owes nothing: spending the last attempt settles every locale it had not
 * delivered (see {@link owedIfGaveUp}), and Payload leaves `hasError` set from that moment on. A run
 * merely waiting to try again owes its undelivered locales, logged failures among them.
 */
export const owedOnCancel = (job: PayloadJob, locales: readonly string[]): string[] =>
  job.hasError === true ? [] : stillOwed(job, locales);
