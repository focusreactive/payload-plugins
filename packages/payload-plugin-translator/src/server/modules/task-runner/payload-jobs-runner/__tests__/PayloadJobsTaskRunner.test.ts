import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";
import { PayloadJobsTaskRunner } from "../PayloadJobsTaskRunner.js";
import type { PayloadJobsRunnerConfig } from "../config.js";
import type { PayloadJob } from "../store/types.js";
import type { TaskInput } from "../../types.js";
import { asRequester } from "../../../../shared/payload/RequestScope.shapes.js";

const testContext = {
  handler: vi.fn().mockResolvedValue(undefined),
  report: vi.fn().mockResolvedValue(undefined),
};

const context = testContext;

const createJob = (overrides: Partial<PayloadJob> = {}): PayloadJob => ({
  id: "job-123",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  input: { handle: "run-1", locales: ["de"] },
  ...overrides,
});

describe("PayloadJobsTaskRunner", () => {
  let mockPayload: {
    find: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    db: { updateOne: ReturnType<typeof vi.fn> };
    config: { jobs?: { enableConcurrencyControl?: boolean } };
    jobs: {
      queue: ReturnType<typeof vi.fn>;
      cancel: ReturnType<typeof vi.fn>;
      run: ReturnType<typeof vi.fn>;
      runByID: ReturnType<typeof vi.fn>;
    };
  };
  let config: PayloadJobsRunnerConfig;
  let runner: PayloadJobsTaskRunner;

  beforeEach(() => {
    testContext.report.mockClear();
    testContext.handler.mockClear();
    mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({ docs: [] }),
      db: { updateOne: vi.fn().mockResolvedValue(undefined) },
      config: { jobs: {} },
      jobs: {
        queue: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockResolvedValue(undefined),
        run: vi
          .fn()
          .mockResolvedValue({ jobStatus: { "job-123": {} }, remainingJobsFromQueried: 0 }),
        // kept only so tests can assert run() never falls back to the broken
        // runByID id-path — production code does not call it.
        runByID: vi.fn().mockResolvedValue(undefined),
      },
    };
    config = {
      taskName: "translate_document",
      workflowName: "translate_document_locales",
      queueName: "translations",
      jobsCollection: "payload-jobs",
      autoRun: {
        cron: "* * * * *",
        limit: 50,
      },
      staleJobTimeoutMs: 300_000,
    };
    runner = new PayloadJobsTaskRunner(mockPayload as unknown as Payload, config, testContext);
  });

  const createInput = (overrides: Partial<TaskInput> = {}): TaskInput => ({
    collectionSlug: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    publishOnTranslation: false,
    ...overrides,
  });

  const createLiveJob = (overrides: Partial<PayloadJob> = {}): PayloadJob =>
    createJob({
      input: { handle: "run-live", locales: ["de"] },
      ...overrides,
    });

  describe("enqueue", () => {
    it("reads no job at all before queuing one", async () => {
      await runner.enqueue([createInput()]);

      expect(
        mockPayload.find,
        "whether this document may take new work is the plugin's to decide, from its own record"
      ).not.toHaveBeenCalled();
    });

    it("queues its own run even for a document a live job already names", async () => {
      mockPayload.find.mockResolvedValue({ docs: [createLiveJob({ id: "live-job" })] });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      expect(
        mockPayload.db.updateOne,
        "nothing is merged into a run under way"
      ).not.toHaveBeenCalled();
      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(1);
    });

    it("queues one workflow per document, carrying a pointer and its locales", async () => {
      await runner.enqueue([createInput({ targetLng: "de" }), createInput({ targetLng: "fr" })]);

      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(1);
      expect(mockPayload.jobs.queue).toHaveBeenCalledWith({
        workflow: "translate_document_locales",
        queue: "translations",
        waitUntil: undefined,
        input: { handle: expect.any(String), locales: ["de", "fr"] },
        req: {},
      });
    });

    it("states nothing about the run in the job row, because the record states it", async () => {
      await runner.enqueue([createInput()], { requester: asRequester(0, "editors") });

      const { input } = (mockPayload.jobs.queue as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(
        Object.keys(input).sort(),
        "a job row that states a fact about the run states it twice"
      ).toEqual(["handle", "locales"]);
    });

    it("tells the plugin what the run is about, so the record can hold it", async () => {
      await runner.enqueue([createInput()], { requester: asRequester(0, "editors") });

      expect(context.report).toHaveBeenCalledWith(
        mockPayload,
        { handle: expect.any(String), targetLng: "de" },
        {
          state: "queued",
          work: {
            collectionSlug: "posts",
            collectionId: "doc-123",
            sourceLng: "en",
            filters: undefined,
            publishOnTranslation: false,
          },
        },
        expect.objectContaining({ requester: { userId: 0, userCollection: "editors" } })
      );
    });

    it("writes the record before the job exists, so a cron cannot outrun it", async () => {
      await runner.enqueue([createInput()]);

      expect(
        (context.report as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
        "a job picked up before its record would translate nothing and settle nothing"
      ).toBeLessThan(
        (mockPayload.jobs.queue as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
      );
    });

    // Enqueuing now joins the caller's transaction, which it did not before the scope existed. That
    // is deliberate: a job row queued by a save that then rolls back would otherwise survive it and
    // translate a document whose edit never happened. The row lives and dies with the edit.
    it("queues the job inside the caller's transaction", async () => {
      await runner.enqueue([createInput()], { transactionID: "tx-7" });

      expect(mockPayload.jobs.queue).toHaveBeenCalledWith(
        expect.objectContaining({ req: { transactionID: "tx-7" } })
      );
    });

    it("passes waitUntil through to payload.jobs.queue when set (debounce)", async () => {
      const when = new Date("2024-06-01T00:00:00Z");
      await runner.enqueue([createInput({ waitUntil: when })]);

      expect(mockPayload.jobs.queue).toHaveBeenCalledWith(
        expect.objectContaining({ waitUntil: when })
      );
    });

    it("leaves waitUntil undefined for the manual path (no debounce)", async () => {
      await runner.enqueue([createInput()]);

      const arg = (mockPayload.jobs.queue as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(arg.waitUntil).toBeUndefined();
    });

    it("queues one workflow per document, not one per task", async () => {
      await runner.enqueue([
        createInput({ collectionId: "doc-1", targetLng: "de" }),
        createInput({ collectionId: "doc-1", targetLng: "fr" }),
        createInput({ collectionId: "doc-2", targetLng: "de" }),
      ]);

      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(2);
    });

    it("never cancels or deletes a job when enqueuing", async () => {
      mockPayload.find.mockResolvedValue({ docs: [createLiveJob({ id: "live-job" })] });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      expect(mockPayload.jobs.cancel).not.toHaveBeenCalled();
      expect(mockPayload.delete).not.toHaveBeenCalled();
    });

    it("queues one run per document, however many the batch spans", async () => {
      await runner.enqueue([
        createInput({ collectionSlug: "posts" as CollectionSlug, collectionId: "post-1" }),
        createInput({ collectionSlug: "posts" as CollectionSlug, collectionId: "post-2" }),
        createInput({ collectionSlug: "pages" as CollectionSlug, collectionId: "page-1" }),
      ]);

      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(3);
    });

    it("names the document to the record as a string, whatever shape its id had", async () => {
      await runner.enqueue([createInput({ collectionId: 5 as unknown as string })]);

      expect(
        (context.report as ReturnType<typeof vi.fn>).mock.calls[0][2].work,
        "the plugin is ID-agnostic: every document id is a string to it"
      ).toMatchObject({ collectionSlug: "posts", collectionId: "5" });
    });
  });

  describe("cancel", () => {
    it("cancels the jobs these handles name", async () => {
      mockPayload.find.mockResolvedValue({
        docs: [
          { id: "job-1", input: { handle: "run-1", locales: ["de"] } },
          { id: "job-2", input: { handle: "run-2", locales: ["de"] } },
        ],
      });

      await runner.stop(["run-1", "run-2"]);

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            and: expect.arrayContaining([{ "input.handle": { in: ["run-1", "run-2"] } }]),
          }),
        })
      );
      expect(mockPayload.jobs.cancel).toHaveBeenCalledWith({
        where: {
          and: [
            {
              or: [
                { workflowSlug: { equals: "translate_document_locales" } },
                { taskSlug: { equals: "translate_document" } },
              ],
            },
            { id: { in: ["job-1", "job-2"] } },
          ],
        },
        queue: "translations",
      });
      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: "payload-jobs",
        where: {
          and: [
            {
              or: [
                { workflowSlug: { equals: "translate_document_locales" } },
                { taskSlug: { equals: "translate_document" } },
              ],
            },
            { id: { in: ["job-1", "job-2"] } },
          ],
        },
      });
    });

    it("deletes only this plugin's jobs, whatever handle it is given", async () => {
      mockPayload.find.mockResolvedValue({
        docs: [{ id: "job-1", input: { handle: "run-1", locales: ["de"] } }],
      });

      await runner.stop(["run-1"]);

      const where = mockPayload.delete.mock.calls[0][0].where as { and?: unknown[] };
      expect(where.and?.[0]).toEqual({
        or: [
          { workflowSlug: { equals: "translate_document_locales" } },
          { taskSlug: { equals: "translate_document" } },
        ],
      });
    });

    it("touches nothing for a handle no job of ours carries", async () => {
      await runner.stop(["someone-elses-handle"]);

      expect(mockPayload.jobs.cancel).not.toHaveBeenCalled();
      expect(mockPayload.delete).not.toHaveBeenCalled();
    });

    it("does nothing for empty array", async () => {
      await runner.stop([]);

      expect(mockPayload.jobs.cancel).not.toHaveBeenCalled();
      expect(mockPayload.delete).not.toHaveBeenCalled();
    });
  });

  describe("run", () => {
    afterEach(() => {
      expect(mockPayload.jobs.runByID).not.toHaveBeenCalled();
    });

    it("returns not_found when task does not exist", async () => {
      mockPayload.find.mockResolvedValue({ docs: [] });

      const result = await runner.run("nonexistent");

      expect(result).toEqual({ success: false, error: "not_found" });
    });

    it("returns already_completed when task is completed", async () => {
      const completedJob = createJob({ completedAt: "2024-01-01T01:00:00Z" });
      mockPayload.find.mockResolvedValue({ docs: [completedJob] });

      const result = await runner.run("job-123");

      expect(result).toEqual({ success: false, error: "already_completed" });
    });

    it("retries a workflow whose locales are logged but whose run failed", async () => {
      const partiallyFailed = createJob({
        input: {
          collection_slug: "posts",
          collection_id: "doc-123",
          source_lng: "en",
          targets: [
            { lng: "de", filters: [] },
            { lng: "fr", filters: [] },
          ],
        },
        log: [
          { state: "succeeded", completedAt: "2024-01-01T00:01:00Z", input: { target_lng: "de" } },
          { state: "failed", completedAt: "2024-01-01T00:02:00Z", input: { target_lng: "fr" } },
        ],
      });
      mockPayload.find.mockResolvedValue({ docs: [partiallyFailed] });

      const result = await runner.run("run-1");

      expect(result).toEqual({ success: true });
      expect(mockPayload.jobs.run).toHaveBeenCalledWith({
        queue: "translations",
        where: { id: { equals: partiallyFailed.id } },
        limit: 1,
      });
    });

    it("reports failure when the picker took nothing", async () => {
      mockPayload.find.mockResolvedValue({ docs: [createJob()] });
      mockPayload.jobs.run.mockResolvedValue({ jobStatus: {}, remainingJobsFromQueried: 0 });

      expect(await runner.run("job-123")).toEqual({
        success: false,
        error: "already_running",
      });
    });

    it("clears the blockers even for a job that is neither running nor failed", async () => {
      const stillDebounced = new Date(Date.now() + 60_000).toISOString();
      const queued = createJob({ processing: false, waitUntil: stillDebounced });
      mockPayload.find.mockResolvedValue({ docs: [queued] });

      const result = await runner.run("job-123");

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { equals: "job-123" } },
          data: { processing: false, hasError: false, error: null, waitUntil: null },
        })
      );
      expect(result).toEqual({ success: true });
    });

    it("returns already_running when a job is genuinely in flight (fresh lock)", async () => {
      const runningJob = createJob({
        processing: true,
        updatedAt: new Date().toISOString(),
      });
      mockPayload.find.mockResolvedValue({ docs: [runningJob] });

      const result = await runner.run("job-123");

      expect(result).toEqual({ success: false, error: "already_running" });
      expect(mockPayload.jobs.run).not.toHaveBeenCalled();
      // Clearing above this guard would reset `processing` on a live job and let a second worker
      // take the same document.
      expect(mockPayload.update).not.toHaveBeenCalled();
    });

    it("re-runs a job whose processing lock is stale (killed mid-run)", async () => {
      // processing=true but updatedAt far older than staleJobTimeoutMs — the
      // owning run is presumed dead, so force-run clears the lock and re-runs
      // it instead of refusing it as already-running.
      const staleJob = createJob({
        processing: true,
        updatedAt: "2024-01-01T00:00:00Z",
      });
      mockPayload.find.mockResolvedValue({ docs: [staleJob] });

      const result = await runner.run("job-123");

      expect(result).toEqual({ success: true });
      // stale lock cleared first so the queue picker can select it
      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: "payload-jobs",
        depth: 0,
        where: { id: { equals: "job-123" } },
        data: { processing: false, hasError: false, error: null, waitUntil: null },
      });
      expect(mockPayload.jobs.run).toHaveBeenCalledWith({
        queue: "translations",
        where: { id: { equals: "job-123" } },
        limit: 1,
      });
      // update (lock reset) must precede jobs.run — a regression that runs first
      // would leave the job stuck processing: true when run rejects
      expect(mockPayload.update.mock.invocationCallOrder[0]).toBeLessThan(
        mockPayload.jobs.run.mock.invocationCallOrder[0]
      );
    });

    it("re-runs a stale locked job and propagates jobs.run rejection after resetting the lock", async () => {
      const staleJob = createJob({
        processing: true,
        updatedAt: "2024-01-01T00:00:00Z",
      });
      mockPayload.find.mockResolvedValue({ docs: [staleJob] });
      mockPayload.update.mockResolvedValue({ docs: [staleJob] });
      mockPayload.jobs.run.mockRejectedValueOnce(new Error("boom"));

      await expect(runner.run("job-123")).rejects.toThrow("boom");
      // lock reset must have been called even though jobs.run threw
      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: "payload-jobs",
        depth: 0,
        where: { id: { equals: "job-123" } },
        data: { processing: false, hasError: false, error: null, waitUntil: null },
      });
    });

    it("runs a pending task via the where-based picker (not runByID)", async () => {
      const pendingJob = createJob();
      mockPayload.find.mockResolvedValue({ docs: [pendingJob] });

      const result = await runner.run("run-1");

      expect(result).toEqual({ success: true });
      expect(mockPayload.jobs.run).toHaveBeenCalledWith({
        queue: "translations",
        where: { id: { equals: pendingJob.id } },
        limit: 1,
      });
      expect(mockPayload.update.mock.invocationCallOrder[0]).toBeLessThan(
        mockPayload.jobs.run.mock.invocationCallOrder[0]
      );
      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            and: [
              {
                or: [
                  { workflowSlug: { equals: "translate_document_locales" } },
                  { taskSlug: { equals: "translate_document" } },
                ],
              },
              { "input.handle": { in: ["run-1"] } },
            ],
          },
        })
      );
    });

    it("awaits the job execution before resolving", async () => {
      // The run must complete within the request (so nothing is abandoned after
      // the HTTP response). A rejection from jobs.run must propagate, not be
      // swallowed as a false success.
      const pendingJob = createJob();
      mockPayload.find.mockResolvedValue({ docs: [pendingJob] });
      mockPayload.jobs.run.mockRejectedValueOnce(new Error("boom"));

      await expect(runner.run("job-123")).rejects.toThrow("boom");
    });

    it("treats a running job with a missing/invalid updatedAt as stale and re-runs it", async () => {
      // isStale returns true for NaN updatedAt — the job must be re-run rather
      // than permanently refused as already-running.
      const badJob = createJob({ processing: true, updatedAt: "" });
      mockPayload.find.mockResolvedValue({ docs: [badJob] });

      const result = await runner.run("job-123");

      expect(result).toEqual({ success: true });
      expect(mockPayload.jobs.run).toHaveBeenCalled();
    });
  });

  describe("reclaimStaleJobs", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("narrows the stale-lock reset to both stored slugs", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

      mockPayload.update.mockResolvedValue({
        docs: [{ id: "a" }, { id: "b" }],
      });

      const count = await runner.reclaimStaleJobs();

      expect(count).toBe(2);
      const arg = mockPayload.update.mock.calls[0][0];
      expect(arg.collection).toBe("payload-jobs");
      expect(arg.data).toEqual({ processing: false });
      expect(arg.depth).toBe(0);
      const expectedCutoff = new Date(
        Date.parse("2026-01-01T00:00:00.000Z") - 300_000
      ).toISOString();
      expect(arg.where).toEqual({
        and: [
          {
            or: [
              { workflowSlug: { equals: "translate_document_locales" } },
              { taskSlug: { equals: "translate_document" } },
            ],
          },
          { processing: { equals: true } },
          { completedAt: { exists: false } },
          { updatedAt: { less_than: expectedCutoff } },
        ],
      });
    });

    it("returns 0 when nothing is stale", async () => {
      mockPayload.update.mockResolvedValue({ docs: [] });
      expect(await runner.reclaimStaleJobs()).toBe(0);
    });
  });
});
