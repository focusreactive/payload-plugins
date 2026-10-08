import { stillOwed } from "../../lifecycle/stillOwed.js";
import type { Task } from "../types.js";
import { isLastAttempt } from "./isLastAttempt.js";
import { normalizeJobLocales } from "./normalizeJob.js";
import type { PayloadJob } from "./types.js";

/**
 * Which locales a run will never deliver, given that `target` has just thrown — nothing while the
 * run still has an attempt left.
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
  retryLimit: number
): Task[] {
  const spentOnThisLocale = isLastAttempt(job.taskStatus?.[taskName]?.[target], retryLimit);
  const spentOnTheRun = isLastAttempt(job, retryLimit);
  if (!spentOnThisLocale && !spentOnTheRun) return [];
  return stillOwed(normalizeJobLocales(job));
}
