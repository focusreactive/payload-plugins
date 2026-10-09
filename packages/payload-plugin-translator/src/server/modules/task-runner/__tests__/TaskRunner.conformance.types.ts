import type { Config } from "payload";

import type { TaskRunnerProvider } from "../../../../index.js";

/**
 * A compile-only fixture, enforced by `check-types` rather than by a running test.
 *
 * It imports one name from the published barrel, which is all a third-party runner can reach.
 * Narrowing `enqueue` to require assignments must make this file fail to compile, and so must
 * dropping `report` from a provider.
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
