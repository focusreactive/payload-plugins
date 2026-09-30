import { describe, it, expect, vi } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { SyncTaskRunner } from "./SyncTaskRunner.js";
import type { Task, TaskInput } from "../types.js";
import { LazyMap } from "../../../shared/utils/index.js";

const task: TaskInput = {
  collectionSlug: "posts" as CollectionSlug,
  collectionId: "doc-1",
  sourceLng: "en",
  targetLng: "de",
  strategy: "overwrite",
  publishOnTranslation: false,
};

function makeRunner() {
  const handler = vi.fn().mockResolvedValue(undefined);
  const tasks = new LazyMap<string, Task>({
    isRemovable: (t) => t.status === "completed" || t.status === "failed",
    getTimestamp: (t) => new Date(t.updatedAt).getTime(),
  });
  return { handler, runner: new SyncTaskRunner({} as Payload, handler, tasks) };
}

describe("SyncTaskRunner — the caller's transaction", () => {
  it("hands the scope to the handler", async () => {
    const { handler, runner } = makeRunner();

    await runner.enqueue([task], { transactionID: "tx-7" });

    expect(handler).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      transactionID: "tx-7",
    });
  });

  it("hands no transaction id to the handler when the caller has none", async () => {
    const { handler, runner } = makeRunner();

    await runner.enqueue([task]);

    const scope = handler.mock.calls[0]?.[2] as { transactionID?: unknown } | undefined;
    expect(scope?.transactionID).toBeUndefined();
  });
});
