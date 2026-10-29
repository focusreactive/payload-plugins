import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionSlug, Payload } from "payload";

import { wireTranslateRunner } from "../wireTranslateRunner.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { TaskRunnerContext, TaskRunnerProvider } from "../../../modules/task-runner/index.js";
import type { QueuedWork } from "../../../modules/task-runner/types.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import { asRequester } from "../../../shared/payload/RequestScope.shapes.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";

const { translateDocument } = vi.hoisted(() => ({
  translateDocument: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../translateDocument.js", () => ({ translateDocument }));

const theRun = { handle: "job-7", targetLng: "de" };

const work = (over: Partial<QueuedWork> = {}): QueuedWork => ({
  collectionSlug: "posts" as CollectionSlug,
  collectionId: "doc-1",
  sourceLng: "en",
  publishOnTranslation: false,
  ...over,
});

const idleRunner = (keep: (context: TaskRunnerContext) => void): TaskRunnerProvider => ({
  capabilities: { stop: false, run: false },
  create: (_payload, context) => {
    keep(context);
    return { enqueue: async () => [] };
  },
  configure: (context) => {
    keep(context);
    return (config) => config;
  },
});

describe("the plugin's own record of a run", () => {
  let store: RunRecordStoreDouble;
  let openedWith: RequestScope[];
  let context: TaskRunnerContext;
  let payload: Payload;
  let logged: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    store = storeDouble({ find: vi.fn().mockResolvedValue(runRow({ handle: "job-7" })) });
    openedWith = [];
    logged = vi.fn();
    payload = { logger: { error: logged } } as unknown as Payload;

    let captured: TaskRunnerContext | undefined;
    wireTranslateRunner({
      translation: {
        translationProvider: {} as TranslationProvider,
        schemaMap: new Map() as CollectionSchemaMap,
        modules: [],
      },
      runner: idleRunner((handed) => {
        captured = handed;
      }),
      lifecycle: {},
      storeFactory: (_payload, scope) => {
        openedWith.push(scope ?? {});
        return store;
      },
    });
    if (!captured) throw new Error("the runner was never handed a context");
    context = captured;
  });

  describe("when a locale is queued", () => {
    it("writes one row carrying the work and whoever asked for it", async () => {
      await context.report(
        payload,
        theRun,
        { state: "queued", work: work({ publishOnTranslation: true }) },
        { requester: asRequester(7, "users") }
      );

      expect(store.recordQueued).toHaveBeenCalledTimes(1);
      expect(store.recordQueued).toHaveBeenCalledWith(
        expect.objectContaining({
          handle: "job-7",
          targetLng: "de",
          collectionSlug: "posts",
          collectionId: "doc-1",
          sourceLng: "en",
          publishOnTranslation: true,
          requesterId: "7",
          requesterCollection: "users",
        })
      );
    });

    it("stamps the moment it was queued", async () => {
      await context.report(payload, theRun, { state: "queued", work: work() });

      const [written] = store.recordQueued.mock.calls[0];
      expect(Number.isNaN(Date.parse(written.queuedAt))).toBe(false);
    });

    it("records nobody when the request carried no requester", async () => {
      await context.report(payload, theRun, { state: "queued", work: work() });

      expect(store.recordQueued).toHaveBeenCalledWith(
        expect.objectContaining({ requesterId: null, requesterCollection: null })
      );
    });

    it("fails the report when the row cannot be written, rather than losing the run", async () => {
      const boom = new Error("the database said no");
      store.recordQueued.mockRejectedValue(boom);

      await expect(context.report(payload, theRun, { state: "queued", work: work() })).rejects.toBe(
        boom
      );
    });

    it("opens the store on the caller's transaction", async () => {
      await context.report(
        payload,
        theRun,
        { state: "queued", work: work() },
        {
          transactionID: "tx-9",
        }
      );

      expect(openedWith).toContainEqual(expect.objectContaining({ transactionID: "tx-9" }));
    });
  });

  describe("when a locale settles", () => {
    it("records a delivery with no failure text", async () => {
      await context.report(payload, theRun, { state: "delivered" });

      expect(store.recordSettled).toHaveBeenCalledWith(
        theRun,
        expect.objectContaining({ outcome: "delivered", error: null })
      );
    });

    it("records a cancellation with no failure text", async () => {
      await context.report(payload, theRun, { state: "cancelled" });

      expect(store.recordSettled).toHaveBeenCalledWith(
        theRun,
        expect.objectContaining({ outcome: "cancelled", error: null })
      );
    });

    it("records a failure with text a reader can act on", async () => {
      vi.stubEnv("NODE_ENV", "development");

      await context.report(payload, theRun, {
        state: "failed",
        error: new Error("the model refused"),
      });

      expect(store.recordSettled).toHaveBeenCalledWith(
        theRun,
        expect.objectContaining({ outcome: "failed", error: "the model refused" })
      );
    });

    it("keeps provider detail out of the row", async () => {
      vi.stubEnv("NODE_ENV", "production");

      await context.report(payload, theRun, {
        state: "failed",
        error: new Error("401 Incorrect API key provided: sk-proj-9f3a"),
      });

      const [, settlement] = store.recordSettled.mock.calls[0];
      expect(settlement.error).not.toContain("sk-proj");
      expect(settlement.error).not.toContain("401");
    });

    it("stamps when the plugin was told, not when it happened", async () => {
      await context.report(payload, theRun, { state: "delivered" });

      const [, settlement] = store.recordSettled.mock.calls[0];
      expect(Number.isNaN(Date.parse(settlement.settledAt))).toBe(false);
    });

    it("finds the document in the record, because the runner no longer knows it", async () => {
      await context.report(payload, theRun, { state: "delivered" });

      expect(store.find).toHaveBeenCalledWith(theRun);
    });

    it("settles a locale whose row has been pruned, and tells the host nothing it cannot name", async () => {
      store.find.mockResolvedValue(null);

      await expect(
        context.report(payload, theRun, { state: "delivered" })
      ).resolves.toBeUndefined();
      expect(store.recordSettled).toHaveBeenCalled();
    });

    it("logs and carries on when the settlement cannot be written outside a transaction", async () => {
      store.recordSettled.mockRejectedValue(new Error("the database said no"));

      await expect(
        context.report(payload, theRun, { state: "delivered" })
      ).resolves.toBeUndefined();
      expect(logged).toHaveBeenCalled();
    });

    it("lets the failure out inside the caller's transaction, which it has already killed", async () => {
      const boom = new Error("the database said no");
      store.recordSettled.mockRejectedValue(boom);

      await expect(
        context.report(payload, theRun, { state: "delivered" }, { transactionID: "tx-9" })
      ).rejects.toBe(boom);
    });
  });
});
