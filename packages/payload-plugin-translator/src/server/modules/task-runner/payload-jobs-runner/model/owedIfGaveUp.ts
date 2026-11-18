import { isLastAttempt } from "./isLastAttempt.js";
import type { PayloadJob } from "../store/index.js";

import { stillOwed } from "./stillOwed.js";

/**
 * Which locales a run will never deliver, given that `target` has just thrown.
 *
 * Only the loop walking a run's locales can answer it: it stops at the locale that threw, so the
 * ones after it never start and nothing else ever sees them.
 *
 * Payload gives up two ways and either one ends the run, so both are asked: the locale's attempts
 * against the task limit (`handleTaskError.js:54`) and the run's executions against the workflow
 * limit (`getWorkflowRetryBehavior.js:8`).
 */
export function owedIfGaveUp(
  job: PayloadJob,
  taskName: string,
  target: string,
  retryLimit: number,
  locales: readonly string[]
): string[] {
  const spentOnThisLocale = isLastAttempt(job.taskStatus?.[taskName]?.[target], retryLimit);
  const spentOnTheRun = isLastAttempt(job, retryLimit);
  if (!spentOnThisLocale && !spentOnTheRun) return [];
  return stillOwed(job, locales);
}
