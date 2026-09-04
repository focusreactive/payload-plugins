import type { Task, TaskStatus } from "../types";
import type { JobLogEntry, PayloadJob } from "./types";
import { readCollectionRef } from "./readCollectionRef";

/**
 * Transform Payload job to normalized Task
 */
export function normalizeJob(job: PayloadJob): Task {
  const { collectionSlug, collectionId } = readCollectionRef(job.input);

  return {
    id: job.id,
    status: getJobStatus(job),
    input: {
      collectionSlug,
      collectionId,
      sourceLng: job.input?.source_lng ?? "",
      targetLng: job.input?.target_lng ?? "",
      strategy: (job.input?.strategy as "overwrite" | "skip_existing") ?? "overwrite",
      publishOnTranslation: job.input?.publish_on_translation ?? false,
    },
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt ?? undefined,
    error: job.error ? { message: extractErrorMessage(job.error) } : undefined,
    cancelled: isCancelled(job.error),
  };
}

function getJobStatus(job: PayloadJob): TaskStatus {
  if (job.completedAt) return "completed";
  if (job.processing) return "running";
  if (job.error) return "failed";
  return "pending";
}

function extractErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Unknown error";
}

function isCancelled(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "cancelled" in error &&
    typeof error.cancelled === "boolean" &&
    error.cancelled
  );
}

/**
 * Expand a stored job into one {@link Task} per target locale.
 *
 * A document's locales are one workflow job now, but the status panels are per-locale — so the
 * per-locale rows are rebuilt from the job's `log`, which Payload writes an entry into as each
 * locale's task finishes. A locale with no entry yet has not run: it reports the job's own state.
 *
 * A job in the pre-workflow shape carries a single `target_lng` and expands to itself, so jobs
 * queued before the change stay readable. See docs/DEPRECATIONS.md#jobs-input-collection-field for
 * the same expand/contract elsewhere in this file's neighbourhood.
 */
export function normalizeJobLocales(job: PayloadJob): Task[] {
  const targets = job.input?.target_lngs;
  if (!Array.isArray(targets) || targets.length === 0) return [normalizeJob(job)];

  const base = normalizeJob(job);
  const byLocale = new Map<string, JobLogEntry>();
  for (const entry of job.log ?? []) {
    const lng = entry?.input?.target_lng;
    if (typeof lng === "string") byLocale.set(lng, entry);
  }

  return targets.map((targetLng) => {
    const entry = byLocale.get(targetLng);
    return {
      // The real job id, repeated across the locales: they are rows of one job, and cancelling any of
      // them cancels that job. A synthetic per-locale id would be handed straight to `cancel()`,
      // which addresses jobs.
      ...base,
      status: entry ? logStateToStatus(entry.state) : base.status,
      completedAt: entry?.completedAt ?? undefined,
      input: { ...base.input, targetLng },
    };
  });
}

function logStateToStatus(state: JobLogEntry["state"]): TaskStatus {
  return state === "succeeded" ? "completed" : "failed";
}
