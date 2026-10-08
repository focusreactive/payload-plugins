import type { Config } from "payload";

import type { EnqueueAssignment, Task, TaskRunnerProvider } from "../../../../index.js";

/**
 * A compile-only fixture, enforced by `check-types` rather than by a running test.
 *
 * A runner is implemented outside this package, so it is written against the published root barrel —
 * which is what this file imports, rather than the internal paths no installer can reach. Widening
 * `enqueue` must not break an implementation written before the widening: both generations below
 * must keep satisfying the contract, and narrowing `enqueue` to require assignments makes this file
 * fail to compile, which is the point of it existing.
 */

const unqueues = {
  cancel: async (): Promise<void> => undefined,
  run: async () => ({ success: false, error: "not_found" }) as const,
  findByCollection: async (): Promise<Task[]> => [],
};

const configure = () => (config: Config) => config;

/** Pre-0.16.0: answers with nothing, and has no by-handle read. */
export const silent: TaskRunnerProvider = {
  create: () => ({ ...unqueues, enqueue: async () => undefined }),
  configure,
};

/** Post-0.16.0: one assignment per requested locale, and resolves handles. */
export const answering: TaskRunnerProvider = {
  create: () => ({
    ...unqueues,
    enqueue: async (tasks): Promise<EnqueueAssignment[]> =>
      tasks.map((task) => ({
        collectionSlug: task.collectionSlug,
        collectionId: task.collectionId,
        targetLng: task.targetLng,
        handle: "run-1",
      })),
    findByIds: async (): Promise<Task[]> => [],
  }),
  configure,
};
