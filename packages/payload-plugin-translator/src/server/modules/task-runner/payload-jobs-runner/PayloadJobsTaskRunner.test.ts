import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner";
import type { PayloadJobsRunnerConfig, PayloadJob } from "./types";
import type { TaskInput } from "../types";

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
    mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({ docs: [] }),
      db: { updateOne: vi.fn().mockResolvedValue(undefined) },
      config: { jobs: {} },
      jobs: {
        queue: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockResolvedValue(undefined),
        // A non-empty `jobStatus` is how Payload reports that the picker actually took a job.
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
    runner = new PayloadJobsTaskRunner(mockPayload as unknown as Payload, config);
  });

  const createInput = (overrides: Partial<TaskInput> = {}): TaskInput => ({
    collectionSlug: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    strategy: "overwrite",
    publishOnTranslation: false,
    ...overrides,
  });

  const createJob = (overrides: Partial<PayloadJob> = {}): PayloadJob => ({
    id: "job-123",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    input: {
      collection: { relationTo: "posts" as CollectionSlug, value: "doc-123" },
      source_lng: "en",
      target_lng: "de",
      strategy: "overwrite",
    },
    ...overrides,
  });

  /** A live workflow job whose settings match `createInput()`'s, so `pickHost` accepts it. */
  const createLiveJob = (overrides: Partial<PayloadJob> = {}): PayloadJob =>
    createJob({
      input: {
        collection_slug: "posts",
        collection_id: "doc-123",
        source_lng: "en",
        strategy: "overwrite",
        publish_on_translation: false,
        target_lngs: ["de"],
      },
      ...overrides,
    });

  describe("enqueue", () => {
    it("looks for superseded jobs among unfinished ones only", async () => {
      await runner.enqueue([createInput()]);

      const whereArg = mockPayload.find.mock.calls[0][0].where;
      expect(whereArg).toEqual({
        and: [
          {
            or: [
              { workflowSlug: { equals: "translate_document_locales" } },
              { taskSlug: { equals: "translate_document" } },
            ],
          },
          { completedAt: { exists: false } },
        ],
      });
    });

    it("queues one workflow per document, carrying its locales", async () => {
      await runner.enqueue([createInput({ targetLng: "de" }), createInput({ targetLng: "fr" })]);

      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(1);
      expect(mockPayload.jobs.queue).toHaveBeenCalledWith({
        workflow: "translate_document_locales",
        queue: "translations",
        waitUntil: undefined,
        input: {
          collection_slug: "posts",
          collection_id: "doc-123",
          source_lng: "en",
          target_lngs: ["de", "fr"],
          strategy: "overwrite",
          publish_on_translation: false,
        },
      });
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

    it("adds the locale to a live job instead of queuing a second one", async () => {
      const live = createLiveJob({ id: "live-job" });
      // First read builds the plan; the second is the check that the write landed, so it answers
      // with the row as the write leaves it.
      mockPayload.find.mockResolvedValueOnce({ docs: [live] }).mockResolvedValueOnce({
        docs: [{ ...live, input: { ...live.input, target_lngs: ["de", "fr"] } }],
      });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      const write = mockPayload.db.updateOne.mock.calls[0][0];
      expect(write.collection).toBe("payload-jobs");
      expect(write.id).toBe("live-job");
      expect(write.data.input).toEqual({
        collection_slug: "posts",
        collection_id: "doc-123",
        source_lng: "en",
        strategy: "overwrite",
        publish_on_translation: false,
        target_lngs: ["de", "fr"],
      });
      expect(mockPayload.jobs.queue).not.toHaveBeenCalled();
    });

    it("does not extend a live job that belongs to a different document", async () => {
      mockPayload.find.mockResolvedValue({
        docs: [
          createJob({
            id: "other-doc-job",
            input: {
              collection_slug: "posts",
              collection_id: "doc-999",
              source_lng: "en",
              strategy: "overwrite",
              target_lngs: ["de"],
            },
          }),
        ],
      });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      expect(mockPayload.db.updateOne).not.toHaveBeenCalled();
      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(1);
    });

    it("never cancels or deletes a job when enqueuing", async () => {
      const live = createLiveJob({
        id: "live-job",
      });
      mockPayload.find.mockResolvedValueOnce({ docs: [live] }).mockResolvedValueOnce({
        docs: [{ ...live, input: { ...live.input, target_lngs: ["de", "fr"] } }],
      });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      expect(mockPayload.jobs.cancel).not.toHaveBeenCalled();
      expect(mockPayload.delete).not.toHaveBeenCalled();
    });

    it("gives the locale its own job when the live one finished after the write landed", async () => {
      const live = createLiveJob({ id: "live-job" });
      mockPayload.find.mockResolvedValueOnce({ docs: [live] }).mockResolvedValueOnce({
        docs: [
          {
            ...live,
            completedAt: "2026-01-01T00:00:01Z",
            input: { ...live.input, target_lngs: ["de", "fr"] },
          },
        ],
      });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(1);
      expect(mockPayload.jobs.queue).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ target_lngs: ["fr"] }),
        })
      );
    });

    it("retries the write once when a concurrent append replaced the list", async () => {
      // Not finished, unlike the case above — the locale is simply missing from the stored row.
      const live = createLiveJob({ id: "live-job" });
      const clobbered = { ...live, input: { ...live.input, target_lngs: ["de", "es"] } };
      mockPayload.find
        .mockResolvedValueOnce({ docs: [live] })
        .mockResolvedValueOnce({ docs: [clobbered] })
        .mockResolvedValueOnce({
          docs: [{ ...live, input: { ...live.input, target_lngs: ["de", "es", "fr"] } }],
        });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      expect(mockPayload.db.updateOne).toHaveBeenCalledTimes(2);
      expect(mockPayload.jobs.queue).not.toHaveBeenCalled();
    });

    it("gives the locale its own job when even the retry does not land it", async () => {
      const live = createLiveJob({ id: "live-job" });
      const withoutIt = { ...live, input: { ...live.input, target_lngs: ["de", "es"] } };
      mockPayload.find
        .mockResolvedValueOnce({ docs: [live] })
        .mockResolvedValueOnce({ docs: [withoutIt] })
        .mockResolvedValueOnce({ docs: [withoutIt] });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      expect(mockPayload.jobs.queue).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ target_lngs: ["fr"] }),
        })
      );
    });

    it("pushes a not-yet-started job's debounce out to this request's", async () => {
      const live = createLiveJob({ id: "live-job" });
      mockPayload.find.mockResolvedValue({ docs: [live] });
      const waitUntil = new Date("2026-02-02T00:00:00.000Z");

      await runner.enqueue([createInput({ targetLng: "de", waitUntil })]);

      expect(mockPayload.db.updateOne.mock.calls[0][0].data).toMatchObject({
        waitUntil: "2026-02-02T00:00:00.000Z",
      });
    });

    it("leaves a running job's schedule alone", async () => {
      const running = createLiveJob({ id: "live-job", processing: true });
      mockPayload.find.mockResolvedValue({ docs: [running] });

      await runner.enqueue([
        createInput({ targetLng: "de", waitUntil: new Date("2026-02-02T00:00:00.000Z") }),
      ]);

      expect(mockPayload.db.updateOne).not.toHaveBeenCalled();
    });

    it("queues alongside a running job when the host enabled concurrency control", async () => {
      mockPayload.config.jobs = { enableConcurrencyControl: true };
      mockPayload.find.mockResolvedValue({
        docs: [
          createLiveJob({
            id: "running-job",
            processing: true,
          }),
        ],
      });

      await runner.enqueue([createInput({ targetLng: "fr" })]);

      expect(mockPayload.db.updateOne).not.toHaveBeenCalled();
      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(1);
    });

    it("reads the job table once for the whole batch, however many documents it spans", async () => {
      await runner.enqueue([
        createInput({ collectionSlug: "posts" as CollectionSlug, collectionId: "post-1" }),
        createInput({ collectionSlug: "posts" as CollectionSlug, collectionId: "post-2" }),
        createInput({ collectionSlug: "pages" as CollectionSlug, collectionId: "page-1" }),
      ]);

      expect(mockPayload.find).toHaveBeenCalledTimes(1);
      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(3);
    });

    it("stores the reference as flat text, coercing the id to a string", async () => {
      // The job input stores a flat text reference (ID-agnostic) instead of a
      // Payload relationship field. The relationship field validated the value
      // type against the collection's ID type, so a string id for a number-id
      // collection silently failed validation and left the job stuck. Text
      // storage sidesteps that; the id is normalized to a string on write.
      // See docs/DEPRECATIONS.md#jobs-input-collection-field

      // A number id (e.g. from a number-id collection) is stored as a string
      await runner.enqueue([createInput({ collectionId: 5 as unknown as string })]);
      expect(mockPayload.jobs.queue).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            collection_slug: "posts",
            collection_id: "5",
          }),
        })
      );
      mockPayload.jobs.queue.mockClear();

      // A string id (uuid/text collection) round-trips unchanged
      await runner.enqueue([createInput({ collectionId: "uuid-abc" })]);
      expect(mockPayload.jobs.queue).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            collection_slug: "posts",
            collection_id: "uuid-abc",
          }),
        })
      );

      // The legacy relationship field is no longer written
      const lastCall = mockPayload.jobs.queue.mock.calls.at(-1)?.[0];
      expect(lastCall?.input).not.toHaveProperty("collection");
    });
  });

  describe("cancel", () => {
    it("cancels jobs by ids", async () => {
      await runner.cancel(["job-1", "job-2"]);

      expect(mockPayload.jobs.cancel).toHaveBeenCalledWith({
        where: { id: { in: ["job-1", "job-2"] } },
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

    it("deletes only this plugin's jobs, whatever ids it is handed", async () => {
      await runner.cancel(["someone-elses-job"]);

      const where = mockPayload.delete.mock.calls[0][0].where as { and?: unknown[] };
      expect(where.and?.[0]).toEqual({
        or: [
          { workflowSlug: { equals: "translate_document_locales" } },
          { taskSlug: { equals: "translate_document" } },
        ],
      });
    });

    it("does nothing for empty array", async () => {
      await runner.cancel([]);

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
          target_lngs: ["de", "fr"],
          strategy: "overwrite",
        },
        log: [
          { state: "succeeded", completedAt: "2024-01-01T00:01:00Z", input: { target_lng: "de" } },
          { state: "failed", completedAt: "2024-01-01T00:02:00Z", input: { target_lng: "fr" } },
        ],
      });
      mockPayload.find.mockResolvedValue({ docs: [partiallyFailed] });

      const result = await runner.run("job-123");

      expect(result).toEqual({ success: true });
      expect(mockPayload.jobs.run).toHaveBeenCalledWith({
        queue: "translations",
        where: { id: { equals: "job-123" } },
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

    it("clears what blocks the picker before retrying a failed job", async () => {
      mockPayload.find.mockResolvedValue({
        docs: [createJob({ error: { message: "provider down" } })],
      });

      await runner.run("job-123");

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "payload-jobs",
          where: { id: { equals: "job-123" } },
          data: { processing: false, hasError: false, error: null, waitUntil: null },
        })
      );
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
      // run via the where-based picker, NOT runByID
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

      const result = await runner.run("job-123");

      expect(result).toEqual({ success: true });
      expect(mockPayload.jobs.run).toHaveBeenCalledWith({
        queue: "translations",
        where: { id: { equals: "job-123" } },
        limit: 1,
      });
      // a pending job (processing:false) needs no lock reset
      expect(mockPayload.update).not.toHaveBeenCalled();
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
              { id: { equals: "job-123" } },
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
      // Narrows by real payload-jobs columns only (no JSON-path traversal,
      // which would hit the drizzle SQLite issue documented in findByCollection).
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

  describe("findByCollection", () => {
    it("finds tasks by collection slug", async () => {
      // Mock returns only jobs matching the collection (simulating DB where clause)
      const jobs = [
        createJob({
          id: "job-1",
          input: { collection: { relationTo: "posts", value: "doc-1" } },
        }),
        createJob({
          id: "job-2",
          input: { collection: { relationTo: "posts", value: "doc-2" } },
        }),
      ];
      mockPayload.find.mockResolvedValue({ docs: jobs });

      const tasks = await runner.findByCollection("posts");

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe("job-1");
      expect(tasks[1].id).toBe("job-2");
    });

    it("filters by document ids when provided", async () => {
      // Mock returns only jobs matching collection and document ids (simulating DB where clause)
      const jobs = [
        createJob({
          id: "job-1",
          input: { collection: { relationTo: "posts", value: "doc-1" } },
        }),
        createJob({
          id: "job-2",
          input: { collection: { relationTo: "posts", value: "doc-2" } },
        }),
      ];
      mockPayload.find.mockResolvedValue({ docs: jobs });

      const tasks = await runner.findByCollection("posts" as CollectionSlug, ["doc-1", "doc-2"]);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe("job-1");
      expect(tasks[1].id).toBe("job-2");
    });

    it("returns normalized tasks", async () => {
      const job = createJob({
        id: "job-123",
        completedAt: "2024-01-01T01:00:00Z",
      });
      mockPayload.find.mockResolvedValue({ docs: [job] });

      const tasks = await runner.findByCollection("posts" as CollectionSlug);

      expect(tasks[0]).toMatchObject({
        id: "job-123",
        status: "completed",
        input: {
          collectionSlug: "posts",
          collectionId: "doc-123",
        },
      });
    });

    it("narrows the SQL where clause by the job's own slugs only", async () => {
      // Narrowing by the collection slug or id would re-introduce the SQLite coercion bug and drop
      // the legacy shape — see `findByCollection`'s docblock.
      await runner.findByCollection("posts" as CollectionSlug, [5, 6]);

      const whereArg = mockPayload.find.mock.calls[0][0].where;
      expect(whereArg).toEqual({
        and: [
          {
            or: [
              { workflowSlug: { equals: "translate_document_locales" } },
              { taskSlug: { equals: "translate_document" } },
            ],
          },
        ],
      });
      expect(JSON.stringify(whereArg)).not.toContain("collection_id");
      expect(JSON.stringify(whereArg)).not.toContain("collection.value");
    });

    it("adds completedAt to the where clause when asked to exclude finished jobs", async () => {
      await runner.findByCollection("posts" as CollectionSlug, { excludeCompleted: true });

      const whereArg = mockPayload.find.mock.calls[0][0].where;
      expect(whereArg).toEqual({
        and: [
          {
            or: [
              { workflowSlug: { equals: "translate_document_locales" } },
              { taskSlug: { equals: "translate_document" } },
            ],
          },
          { completedAt: { exists: false } },
        ],
      });
      expect(JSON.stringify(whereArg)).not.toContain("collection_id");
    });

    it("reads the deprecated array form as documentIds", async () => {
      const jobs = [
        createJob({ id: "job-1", input: { collection_slug: "posts", collection_id: "doc-1" } }),
        createJob({ id: "job-2", input: { collection_slug: "posts", collection_id: "doc-2" } }),
      ];
      mockPayload.find.mockResolvedValue({ docs: jobs });

      const positional = await runner.findByCollection("posts" as CollectionSlug, ["doc-1"]);
      const object = await runner.findByCollection("posts" as CollectionSlug, {
        documentIds: ["doc-1"],
      });

      expect(positional.map((t) => t.id)).toEqual(["job-1"]);
      expect(object.map((t) => t.id)).toEqual(positional.map((t) => t.id));
    });

    it("matches jobs stored in both the legacy and the new shape", async () => {
      // payload.find returns the full per-task set; the runner narrows it
      // client-side by slug + id. The result must span both stored shapes:
      // legacy `collection: { relationTo, value }` (value possibly a number)
      // and the new flat `collection_slug` / `collection_id` text fields.
      const legacyJob = createJob({
        id: "legacy-job",
        input: {
          collection: { relationTo: "posts" as CollectionSlug, value: 5 },
        },
      });
      const newJob = createJob({
        id: "new-job",
        input: { collection_slug: "posts", collection_id: "7" },
      });
      const unrelatedJob = createJob({
        id: "unrelated",
        input: { collection_slug: "posts", collection_id: "99" },
      });
      mockPayload.find.mockResolvedValue({
        docs: [legacyJob, newJob, unrelatedJob],
      });

      const tasks = await runner.findByCollection("posts" as CollectionSlug, [5, "7"]);

      expect(tasks.map((t) => t.id).sort()).toEqual(["legacy-job", "new-job"]);
    });

    it("returns every task in the collection when documentIds is omitted", async () => {
      const jobs = [
        createJob({
          id: "a",
          input: { collection: { relationTo: "posts", value: "1" } },
        }),
        createJob({
          id: "b",
          input: { collection: { relationTo: "posts", value: "2" } },
        }),
      ];
      mockPayload.find.mockResolvedValue({ docs: jobs });

      const tasks = await runner.findByCollection("posts" as CollectionSlug);

      expect(tasks.map((t) => t.id)).toEqual(["a", "b"]);
    });
  });
});
