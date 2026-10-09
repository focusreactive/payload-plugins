import type { Config } from "payload";

import type { TaskRunnerProvider } from "../../../../index.js";

/**
 * A compile-only fixture, enforced by `check-types` rather than by a running test.
 *
 * It imports one name from the published barrel, which is all a third-party runner can reach.
 *
 * Two mutations must break it: narrowing `enqueue` to require assignments, and dropping `report`
 * from `TaskRunnerContext`. Neither obliges a runner to *call* `report` — `silent` below never does
 * and compiles, because no type can require that a function be called.
 */

const configure = () => (config: Config) => config;

export const silent: TaskRunnerProvider = {
  create: () => ({
    enqueue: async () => undefined,
    cancel: async (): Promise<void> => undefined,
    run: async () => ({ success: false, error: "not_found" }) as const,
    findByCollection: async () => [],
  }),
  configure,
};

export const answering: TaskRunnerProvider = {
  create: (payload, context) => ({
    enqueue: async (tasks) => {
      const assigned = tasks.map((task) => ({
        collectionSlug: task.collectionSlug,
        collectionId: task.collectionId,
        sourceLng: task.sourceLng,
        targetLng: task.targetLng,
        strategy: task.strategy,
        handle: "run-1",
      }));
      for (const a of assigned) await context.report(payload, a, { state: "queued" });
      return assigned;
    },
    cancel: async (): Promise<void> => undefined,
    run: async () => ({ success: false, error: "not_found" }) as const,
    findByCollection: async () => [],
  }),
  configure,
};
