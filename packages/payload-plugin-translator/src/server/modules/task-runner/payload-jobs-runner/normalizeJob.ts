import type { CollectionSlug } from "payload";

import type { Task, TaskStatus } from "../types";
import type { PayloadJob } from "./types";

/**
 * Transform Payload job to normalized Task
 */
export function normalizeJob(job: PayloadJob): Task {
  return {
    cancelled: isCancelled(job.error),
    completedAt: job.completedAt ?? undefined,
    createdAt: job.createdAt,
    error: job.error ? { message: extractErrorMessage(job.error) } : undefined,
    id: job.id,
    input: {
      collectionId: job.input?.collection?.value ?? "",
      collectionSlug:
        job.input?.collection?.relationTo ?? ("" as CollectionSlug),
      publishOnTranslation: job.input?.publish_on_translation ?? false,
      sourceLng: job.input?.source_lng ?? "",
      strategy:
        (job.input?.strategy as "overwrite" | "skip_existing") ?? "overwrite",
      targetLng: job.input?.target_lng ?? "",
    },
    status: getJobStatus(job),
    updatedAt: job.updatedAt,
  };
}

function getJobStatus(job: PayloadJob): TaskStatus {
  if (job.completedAt) {return "completed";}
  if (job.processing) {return "running";}
  if (job.error) {return "failed";}
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
