import { z } from "zod";
import { runLocales } from "./runTargets.js";

import type { Task, TaskStatus } from "../../types.js";
import type { JobLogEntry, PayloadJob } from "./types.js";
import { readCollectionRef } from "./readCollectionRef.js";

function getJobStatus(job: PayloadJob): TaskStatus {
  if (job.completedAt) return "completed";
  if (job.processing) return "running";
  if (job.hasError) return "failed";
  return "pending";
}

const ErrorWithMessage = z.object({ message: z.string() });
const CancelledError = z.object({ cancelled: z.literal(true) });

function extractErrorMessage(error: unknown): string {
  return ErrorWithMessage.safeParse(error).data?.message ?? "Unknown error";
}

export function isCancelled(error: unknown): boolean {
  return CancelledError.safeParse(error).success;
}

export function normalizeJob(job: PayloadJob): Task {
  const { collectionSlug, collectionId } = readCollectionRef(job.input);

  return {
    id: String(job.id),
    status: getJobStatus(job),
    input: {
      collectionSlug,
      collectionId,
      sourceLng: job.input?.source_lng ?? "",
      targetLng: job.input?.target_lng ?? "",
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
 * Each locale's most recent log entry: Payload appends to `log` chronologically, so last-write-wins
 * leaves the latest attempt.
 */
export function latestLogByLocale(job: PayloadJob): Map<string, JobLogEntry> {
  const byLocale = new Map<string, JobLogEntry>();
  for (const entry of job.log ?? []) {
    const lng = entry?.input?.target_lng;
    if (typeof lng === "string") byLocale.set(lng, entry);
  }
  return byLocale;
}

/**
 * One {@link Task} per target locale of the run; a job that lists none expands to itself.
 *
 * A locale is `completed` only on its own succeeded log entry; every other locale takes the run's
 * status, because Payload appends a `failed` entry on every attempt and marks the job only once it
 * gives up (`queues/errors/handleTaskError.js`).
 */
export function normalizeJobLocales(job: PayloadJob): Task[] {
  const targets = runLocales(job.input);
  if (targets.length === 0) return [normalizeJob(job)];

  const base = normalizeJob(job);
  const latestByLocale = latestLogByLocale(job);

  return targets.map((targetLng) => {
    const entry = latestByLocale.get(targetLng);
    if (!entry) return { ...base, input: { ...base.input, targetLng } };
    const succeeded = entry.state === "succeeded";
    return {
      ...base,
      status: succeeded ? "completed" : base.status,
      completedAt: succeeded ? (entry.completedAt ?? undefined) : undefined,
      error: succeeded ? undefined : base.error,
      cancelled: succeeded ? false : base.cancelled,
      input: { ...base.input, targetLng },
    };
  });
}
