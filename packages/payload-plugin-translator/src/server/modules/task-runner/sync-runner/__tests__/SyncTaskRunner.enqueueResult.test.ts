import { describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";

import { SyncTaskRunner } from "../SyncTaskRunner.js";
import type { TaskInput, Task } from "../../types.js";
import type { TaskHandlerInput } from "../../TaskRunnerProvider.interface.js";
import { LazyMap } from "../../../../shared/utils/index.js";

const makeRunner = () => {
  const tasks = new LazyMap<string, Task>({
    maxSize: 10,
    ttlMs: 60_000,
    isRemovable: () => false,
    getTimestamp: () => Date.now(),
  });
  const seen: TaskHandlerInput[] = [];
  const handler = vi.fn(async (_payload: Payload, handlerInput: TaskHandlerInput) => {
    seen.push(handlerInput);
  });
  return {
    runner: new SyncTaskRunner({} as Payload, handler, tasks),
    seen,
  };
};

const input = (collectionId: string, targetLng: string): TaskInput => ({
  collectionSlug: "posts",
  collectionId,
  sourceLng: "en",
  targetLng,
  strategy: "overwrite",
  publishOnTranslation: false,
});

describe("SyncTaskRunner.enqueue answers with what it ran", () => {
  it("names one entry per task", async () => {
    const { runner } = makeRunner();

    const result = await runner.enqueue([input("doc-1", "de"), input("doc-1", "fr")]);

    expect(result).toHaveLength(2);
    expect(result?.map((entry) => entry.targetLng)).toEqual(["de", "fr"]);
    expect(result?.every((entry) => entry.jobId.length > 0)).toBe(true);
  });

  it("names the same ids its own status read reports, or a caller could not join the two", async () => {
    const { runner } = makeRunner();

    const result = await runner.enqueue([input("doc-1", "de"), input("doc-2", "fr")]);
    const found = await runner.findByCollection("posts");

    expect(new Set(result?.map((entry) => entry.jobId))).toEqual(
      new Set(found.map((task) => task.id))
    );
  });

  it("hands the handler the same id it answered with, so the two never disagree", async () => {
    const { runner, seen } = makeRunner();

    const result = await runner.enqueue([input("doc-1", "de")]);

    expect(seen[0]?.jobId).toBe(result?.[0]?.jobId);
    expect(seen[0]?.jobId).toBeTruthy();
  });

  it("carries the document each entry belongs to", async () => {
    const { runner } = makeRunner();

    const result = await runner.enqueue([input("doc-1", "de"), input("doc-2", "de")]);

    expect(result?.map((entry) => entry.collectionId)).toEqual(["doc-1", "doc-2"]);
    expect(result?.every((entry) => entry.collectionSlug === "posts")).toBe(true);
  });

  it("still answers for a task whose handler threw, since the work was queued either way", async () => {
    const tasks = new LazyMap<string, Task>({
      maxSize: 10,
      ttlMs: 60_000,
      isRemovable: () => false,
      getTimestamp: () => Date.now(),
    });
    const runner = new SyncTaskRunner(
      {} as Payload,
      vi.fn(async () => {
        throw new Error("provider down");
      }),
      tasks
    );

    const result = await runner.enqueue([input("doc-1", "de")]);

    expect(result).toHaveLength(1);
    expect(result?.[0]?.jobId.length).toBeGreaterThan(0);
  });
});
