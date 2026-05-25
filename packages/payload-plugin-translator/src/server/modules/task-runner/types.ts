import type { CollectionSlug } from "payload";

/**
 * Status of a translation task
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed";

/**
 * Input for creating a new translation task
 */
export interface TaskInput {
  collectionSlug: CollectionSlug;
  collectionId: string | number;
  sourceLng: string;
  targetLng: string;
  strategy: "overwrite" | "skip_existing";
  publishOnTranslation: boolean;
}

/**
 * Normalized task representation
 */
export interface Task {
  id: string;
  status: TaskStatus;
  input: TaskInput;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: { message: string };
  cancelled: boolean;
}

/**
 * Result of run operation
 */
export type RunResult =
  | { success: true }
  | {
      success: false;
      error: "not_found" | "already_running" | "already_completed";
    };
