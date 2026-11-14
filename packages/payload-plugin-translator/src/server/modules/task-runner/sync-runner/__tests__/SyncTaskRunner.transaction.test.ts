import { describe, it, expect, vi } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { SyncTaskRunner } from "../SyncTaskRunner.js";
import type { TaskInput } from "../../types.js";

const task: TaskInput = {
  collectionSlug: "posts" as CollectionSlug,
  collectionId: "doc-1",
  sourceLng: "en",
  targetLng: "de",
  publishOnTranslation: false,
};

function makeRunner() {
  const handler = vi.fn().mockResolvedValue(undefined);
  return {
    handler,
    runner: new SyncTaskRunner({} as Payload, {
      handler,
      report: vi.fn().mockResolvedValue(undefined),
    }),
  };
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
