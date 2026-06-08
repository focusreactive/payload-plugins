import type { CollectionSlug } from "payload";

/**
 * Document identifier.
 *
 * The plugin is ID-agnostic: it treats every document ID as a string
 * internally, converting once at ingress (the enqueue boundary / write side).
 * Payload coerces the string back to the collection's native PK type on
 * `findByID` / `update`, so number-id (autoincrement) and string-id (uuid/text)
 * collections both work without the plugin ever branching on ID type.
 */
export type ID = string;

/**
 * Status of a translation task
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed";

/**
 * Input for creating a new translation task
 */
export type TaskInput = {
  collectionSlug: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
  strategy: "overwrite" | "skip_existing";
  publishOnTranslation: boolean;
};

/**
 * Normalized task representation
 */
export type Task = {
  id: string;
  status: TaskStatus;
  input: TaskInput;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: { message: string };
  cancelled: boolean;
};

/**
 * Result of run operation
 */
export type RunResult =
  | { success: true }
  | {
      success: false;
      error: "not_found" | "already_running" | "already_completed";
    };
