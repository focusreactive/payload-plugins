import { APIError } from "payload";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { TransportError } from "../../../../../translation-providers/shared/errors/index.js";
import { SyncTaskRunner } from "../SyncTaskRunner.js";
import type { TaskHandler } from "../../TaskRunnerProvider.interface.js";
import type { RunRef, TaskEvent, TaskInput } from "../../types.js";

type Reported = { run: RunRef; event: TaskEvent };

describe("SyncTaskRunner", () => {
  let mockPayload: Payload;
  let mockHandler: TaskHandler;
  let reported: Reported[];
  let runner: SyncTaskRunner;

  const contextOf = (handler: TaskHandler) => ({
    handler,
    report: vi.fn(async (_payload: Payload, run: RunRef, event: TaskEvent) => {
      reported.push({ run, event });
    }),
  });

  const using = (handler: TaskHandler) => {
    mockHandler = handler;
    runner = new SyncTaskRunner(mockPayload, contextOf(handler));
  };

  const statesFor = (targetLng: string): string[] =>
    reported.filter((entry) => entry.run.targetLng === targetLng).map((entry) => entry.event.state);

  beforeEach(() => {
    mockPayload = {} as Payload;
    reported = [];
    using(vi.fn().mockResolvedValue(undefined));
  });

  const createInput = (overrides: Partial<TaskInput> = {}): TaskInput => ({
    collectionSlug: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    publishOnTranslation: false,
    ...overrides,
  });

  describe("enqueue", () => {
    it("executes handler immediately", async () => {
      const input = createInput();
      await runner.enqueue([input]);

      expect(mockHandler).toHaveBeenCalledWith(
        mockPayload,
        { handle: expect.any(String), targetLng: "de", previousAttempts: 0 },
        {}
      );
    });

    it("ignores waitUntil and runs immediately — there is no queue to wait in", async () => {
      await runner.enqueue([createInput({ waitUntil: new Date("2999-01-01T00:00:00Z") })]);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(statesFor("de")).toEqual(["queued", "delivered"]);
    });

    it("reports a locale failed when the handler throws one of ours", async () => {
      using(vi.fn().mockRejectedValue(new TransportError("Translation failed")));

      await runner.enqueue([createInput()]);

      expect(statesFor("de")).toEqual(["queued", "failed"]);
    });

    it("answers one assignment per requested locale", async () => {
      const answer = await runner.enqueue([
        createInput({ targetLng: "de" }),
        createInput({ targetLng: "fr" }),
      ]);

      expect(answer.map((entry) => entry.targetLng)).toEqual(["de", "fr"]);
      expect(new Set(answer.map((entry) => entry.handle)).size, "each run its own name").toBe(2);
    });

    it("serves a locale once although the request listed it twice", async () => {
      const answer = await runner.enqueue([createInput(), createInput()]);

      expect(answer).toHaveLength(1);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it("finishes the batch for a caller with no transaction to lose", async () => {
      const fromPayload = new APIError("Validation failed", 400);
      using(vi.fn().mockRejectedValueOnce(fromPayload).mockResolvedValueOnce(undefined));

      await expect(
        runner.enqueue([createInput({ targetLng: "de" }), createInput({ targetLng: "fr" })]),
        "nothing of this caller's was rolled back, so one refused locale must not cancel the rest"
      ).resolves.toHaveLength(2);

      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(statesFor("de")).toEqual(["queued", "failed"]);
      expect(statesFor("fr")).toEqual(["queued", "delivered"]);
    });

    it("swallows one of ours even inside the caller's transaction", async () => {
      using(vi.fn().mockRejectedValue(new TransportError("provider down")));

      await expect(
        runner.enqueue([createInput()], { transactionID: "tx-1" }),
        "a provider failure ran no Payload operation, so the editor's save is still intact"
      ).resolves.toHaveLength(1);

      expect(statesFor("de")).toEqual(["queued", "failed"]);
    });

    it("lets a failure that did not come from the translator out", async () => {
      const fromPayload = new APIError("Validation failed", 400);
      using(vi.fn().mockRejectedValue(fromPayload));

      await expect(
        runner.enqueue([createInput()], { transactionID: "tx-1" }),
        "a foreign error means a Payload operation already rolled the editor's save back"
      ).rejects.toBe(fromPayload);
    });

    it("reports the failure of a non-Error throw and still lets it out", async () => {
      using(vi.fn().mockRejectedValue("string error"));

      await expect(runner.enqueue([createInput()], { transactionID: "tx-1" })).rejects.toBe(
        "string error"
      );

      expect(statesFor("de")).toEqual(["queued", "failed"]);
    });

    it("processes multiple documents sequentially", async () => {
      await runner.enqueue([
        createInput({ collectionId: "doc-1" }),
        createInput({ collectionId: "doc-2" }),
        createInput({ collectionId: "doc-3" }),
      ]);

      expect(mockHandler).toHaveBeenCalledTimes(3);
    });

    it("passes the caller's scope to the handler and to every report", async () => {
      await runner.enqueue([createInput()], { transactionID: "tx-9" });

      expect(mockHandler).toHaveBeenCalledWith(mockPayload, expect.anything(), {
        transactionID: "tx-9",
      });
    });
  });
});
