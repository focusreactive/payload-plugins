import type { Task, TaskStatus } from "../types";
import type { JobLogEntry, PayloadJob } from "./types";
import { readCollectionRef } from "./readCollectionRef";

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

export function isCancelled(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "cancelled" in error &&
    typeof error.cancelled === "boolean" &&
    error.cancelled
  );
}

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

/**
 * One {@link Task} per target locale, its state read from {@link latestLogByLocale}. A pre-workflow
 * job carries a single `target_lng` and expands to itself.
 */
export function normalizeJobLocales(job: PayloadJob): Task[] {
  const targets = job.input?.target_lngs;
  if (!Array.isArray(targets) || targets.length === 0) return [normalizeJob(job)];

  const base = normalizeJob(job);
  const latestByLocale = latestLogByLocale(job);

  return targets.map((targetLng) => {
    const entry = latestByLocale.get(targetLng);
    if (!entry) return { ...base, input: { ...base.input, targetLng } };
    const succeeded = entry.state === "succeeded";
    return {
      ...base,
      status: succeeded ? "completed" : "failed",
      completedAt: succeeded ? (entry.completedAt ?? undefined) : undefined,
      error: succeeded ? undefined : base.error,
      cancelled: succeeded ? false : base.cancelled,
      input: { ...base.input, targetLng },
    };
  });
}

/**
 * Each target locale's most recent log entry: Payload appends to `log` chronologically, so
 * last-write-wins leaves the latest attempt. An absent entry means that locale has not run.
 */
export function latestLogByLocale(job: PayloadJob): Map<string, JobLogEntry> {
  const byLocale = new Map<string, JobLogEntry>();
  for (const entry of job.log ?? []) {
    const lng = entry?.input?.target_lng;
    if (typeof lng === "string") byLocale.set(lng, entry);
  }
  return byLocale;
}
