import type { EnqueueResult, TaskRunner } from "../TaskRunner.interface.js";
import type { Task, TaskInput } from "../types.js";

/**
 * A compile-only fixture, enforced by `check-types` rather than by a running test: a runner that
 * answers and one that stays silent must both satisfy {@link TaskRunner}, or a third-party
 * implementation breaks on upgrade. Narrowing `enqueue`'s return makes this file fail to compile.
 */

const reads = {
  cancel: async (): Promise<void> => undefined,
  run: async () => ({ success: false, error: "not_found" }) as const,
  findByCollection: async (): Promise<Task[]> => [],
};

/** Pre-0.16.0: answers with nothing, and omits the optional by-id read entirely. */
export const silent: TaskRunner = { ...reads, enqueue: async () => undefined };

/** Post-0.16.0: one entry per requested locale, several locales sharing one job row. */
export const answering: TaskRunner = {
  ...reads,
  enqueue: async (tasks: TaskInput[]): Promise<EnqueueResult> =>
    tasks.map((task) => ({
      collectionSlug: task.collectionSlug,
      collectionId: task.collectionId,
      targetLng: task.targetLng,
      jobId: "job-77",
    })),
};
