import type { Config } from "payload";

import type { TaskRunnerProvider } from "../../../../index.js";

/**
 * A compile-only fixture, enforced by `check-types` rather than by a running test.
 *
 * It imports one name from the published barrel, which is all a third-party runner can reach.
 *
 * `acceptsWorkAlone` compiles without ever calling `report`: no type can require that a function be
 * called, so the obligation to report is the conformance suite's to assert, not this file's.
 * require that a function be called.
 */

const configure = () => (config: Config) => config;

export const acceptsWorkAlone: TaskRunnerProvider = {
  capabilities: { stop: false, run: false },
  create: () => ({ enqueue: async () => [] }),
  configure,
};

export const reports: TaskRunnerProvider = {
  capabilities: { stop: true, run: true },
  create: (payload, context) => ({
    enqueue: async (tasks) => {
      const assigned = tasks.map((task) => ({
        collectionSlug: task.collectionSlug,
        collectionId: task.collectionId,
        sourceLng: task.sourceLng,
        targetLng: task.targetLng,
        handle: "run-1",
      }));
      for (const a of assigned) {
        await context.report(
          payload,
          { handle: a.handle, targetLng: a.targetLng },
          {
            state: "queued",
            work: {
              collectionSlug: a.collectionSlug,
              collectionId: a.collectionId,
              sourceLng: a.sourceLng,
              publishOnTranslation: false,
            },
          }
        );
      }
      return assigned;
    },
    stop: async (): Promise<void> => undefined,
    run: async () => ({ success: false, error: "not_found" }) as const,
  }),
  configure,
};

/** A runner that does not say what it can do cannot have its routes registered. */
// @ts-expect-error `capabilities` is required; this omits it
export const saysNothingAboutItself: TaskRunnerProvider = {
  create: () => ({ enqueue: async () => [] }),
  configure,
};
