import { describe, it, expect, vi } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { createSyncRunner } from "./SyncRunnerProvider";
import type { TaskRunnerContext } from "../TaskRunnerProvider.interface";
import type { TaskInput } from "../types";

const fakePayload = {} as Payload;

const makeContext = (handler: TaskRunnerContext["handler"]): TaskRunnerContext => ({
  handler,
  collections: ["pages" as CollectionSlug],
});

const sampleInput: TaskInput = {
  collectionSlug: "pages" as CollectionSlug,
  collectionId: "1",
  sourceLng: "en",
  targetLng: "de",
  strategy: "overwrite",
  publishOnTranslation: false,
};

describe("SyncRunnerProvider", () => {
  // The decoupling guarantee (translator plan, 0c): create() takes its handler
  // from the caller-supplied argument, so it no longer depends on a prior
  // configure() call mutating instance state.
  it("create() works without a prior configure() call", () => {
    const runner = createSyncRunner();
    expect(() => runner.create(fakePayload, vi.fn())).not.toThrow();
  });

  it("runs translations through the supplied handler on enqueue", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const runner = createSyncRunner();

    const taskRunner = runner.create(fakePayload, handler);
    await taskRunner.enqueue([sampleInput]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      fakePayload,
      expect.objectContaining({
        collection: "pages",
        collectionId: "1",
        sourceLng: "en",
        targetLng: "de",
        strategy: "overwrite",
        publishOnTranslation: false,
      })
    );
  });

  it("configure() is a no-op modifier (sync runner adds no Payload jobs)", () => {
    const runner = createSyncRunner();
    const config = { jobs: {} } as never;
    expect(runner.configure(makeContext(vi.fn()))(config)).toBe(config);
  });
});
