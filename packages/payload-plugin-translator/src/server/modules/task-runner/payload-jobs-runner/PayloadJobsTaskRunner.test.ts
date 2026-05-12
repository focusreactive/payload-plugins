import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";
import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner";
import type { PayloadJobsRunnerConfig, PayloadJob } from "./types";
import type { TaskInput } from "../types";

describe("PayloadJobsTaskRunner", () => {
  let mockPayload: {
    find: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    jobs: {
      queue: ReturnType<typeof vi.fn>;
      cancel: ReturnType<typeof vi.fn>;
      runByID: ReturnType<typeof vi.fn>;
    };
  };
  let config: PayloadJobsRunnerConfig;
  let runner: PayloadJobsTaskRunner;

  beforeEach(() => {
    mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      delete: vi.fn().mockResolvedValue(undefined),
      jobs: {
        queue: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockResolvedValue(undefined),
        runByID: vi.fn().mockResolvedValue(undefined),
      },
    };
    config = {
      taskName: "translate_document",
      queueName: "translations",
      jobsCollection: "payload-jobs",
      autoRun: {
        cron: "* * * * *",
        limit: 50,
      },
    };
    runner = new PayloadJobsTaskRunner(
      mockPayload as unknown as Payload,
      config,
    );
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

  describe("enqueue", () => {
    it("queues tasks with correct input", async () => {
      const input = createInput();
      await runner.enqueue([input]);

      expect(mockPayload.jobs.queue).toHaveBeenCalledWith({
        task: "translate_document",
        queue: "translations",
        input: {
          collection: { relationTo: "posts", value: "doc-123" },
          source_lng: "en",
          target_lng: "de",
          strategy: "overwrite",
          publish_on_translation: false,
        },
      });
    });

    it("queues multiple tasks", async () => {
      const inputs = [
        createInput({ collectionId: "doc-1" }),
        createInput({ collectionId: "doc-2" }),
      ];
      await runner.enqueue(inputs);

      expect(mockPayload.jobs.queue).toHaveBeenCalledTimes(2);
    });

    it("cancels existing jobs before queuing new ones", async () => {
      const existingJob = createJob({ id: "existing-job" });
      mockPayload.find.mockResolvedValueOnce({ docs: [existingJob] });

      const input = createInput();
      await runner.enqueue([input]);

      expect(mockPayload.jobs.cancel).toHaveBeenCalledWith({
        where: { id: { in: ["existing-job"] } },
        queue: "translations",
      });
      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: "payload-jobs",
        where: { id: { in: ["existing-job"] } },
      });
    });

    it("does not cancel when no existing jobs", async () => {
      mockPayload.find.mockResolvedValue({ docs: [] });

      const input = createInput();
      await runner.enqueue([input]);

      expect(mockPayload.jobs.cancel).not.toHaveBeenCalled();
      expect(mockPayload.delete).not.toHaveBeenCalled();
    });

    it("groups tasks by collection", async () => {
      const inputs = [
        createInput({
          collectionSlug: "posts" as CollectionSlug,
          collectionId: "post-1",
        }),
        createInput({
          collectionSlug: "posts" as CollectionSlug,
          collectionId: "post-2",
        }),
        createInput({
          collectionSlug: "pages" as CollectionSlug,
          collectionId: "page-1",
        }),
      ];

      await runner.enqueue(inputs);

      // Should check for existing jobs per collection
      expect(mockPayload.find).toHaveBeenCalledTimes(2);
    });

    it("preserves the collectionId type when storing job input", async () => {
      // Payload's Jobs `input` schema declares `collection` as a relationship
      // field which validates the value's type against the target collection's
      // ID type (number for autoincrement, string for uuid). The runner must
      // not coerce the type on write or jobs would silently fail validation
      // and stay stuck in processing. Findability across mixed types is
      // handled by in-memory filtering in `findByCollection`.
      await runner.enqueue([createInput({ collectionId: 5 })]);
      expect(mockPayload.jobs.queue).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            collection: { relationTo: "posts", value: 5 },
          }),
        }),
      );
      mockPayload.jobs.queue.mockClear();

      await runner.enqueue([createInput({ collectionId: "uuid-abc" })]);
      expect(mockPayload.jobs.queue).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            collection: { relationTo: "posts", value: "uuid-abc" },
          }),
        }),
      );
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
        where: { id: { in: ["job-1", "job-2"] } },
      });
    });

    it("does nothing for empty array", async () => {
      await runner.cancel([]);

      expect(mockPayload.jobs.cancel).not.toHaveBeenCalled();
      expect(mockPayload.delete).not.toHaveBeenCalled();
    });
  });

  describe("run", () => {
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

    it("returns already_running when task is running", async () => {
      const runningJob = createJob({ processing: true });
      mockPayload.find.mockResolvedValue({ docs: [runningJob] });

      const result = await runner.run("job-123");

      expect(result).toEqual({ success: false, error: "already_running" });
    });

    it("runs task and returns success", async () => {
      const pendingJob = createJob();
      mockPayload.find.mockResolvedValue({ docs: [pendingJob] });

      const result = await runner.run("job-123");

      expect(result).toEqual({ success: true });
      expect(mockPayload.jobs.runByID).toHaveBeenCalledWith({ id: "job-123" });
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

      const tasks = await runner.findByCollection("posts" as CollectionSlug, [
        "doc-1",
        "doc-2",
      ]);

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

    it("does not put `collection.value` into the SQL where clause", async () => {
      // Filtering by value happens in memory (see PayloadJobsTaskRunner.findByCollection
      // for the full reasoning). The WHERE sent to Payload must narrow only by
      // taskSlug + relationTo — never by `input.collection.value`, otherwise we
      // re-introduce the SQLite type-coercion bug this code path works around.
      await runner.findByCollection("posts" as CollectionSlug, [5, 6]);

      const whereArg = mockPayload.find.mock.calls[0][0].where;
      expect(whereArg).toEqual({
        and: [
          { taskSlug: { equals: "translate_document" } },
          { "input.collection.relationTo": { equals: "posts" } },
        ],
      });
      expect(JSON.stringify(whereArg)).not.toContain("input.collection.value");
    });

    it("filters in memory and matches both number- and string-typed stored values", async () => {
      // payload.find returns the full per-collection set; the runner narrows
      // it client-side by `collection.value`. Both legacy (number) and new
      // (string) stored shapes must match when the caller passes either type.
      const legacyJob = createJob({
        id: "legacy-job",
        input: {
          collection: { relationTo: "posts" as CollectionSlug, value: 5 },
        },
      });
      const newJob = createJob({
        id: "new-job",
        input: {
          collection: { relationTo: "posts" as CollectionSlug, value: "7" },
        },
      });
      const unrelatedJob = createJob({
        id: "unrelated",
        input: {
          collection: { relationTo: "posts" as CollectionSlug, value: "99" },
        },
      });
      mockPayload.find.mockResolvedValue({
        docs: [legacyJob, newJob, unrelatedJob],
      });

      const tasks = await runner.findByCollection("posts" as CollectionSlug, [
        5,
        "7",
      ]);

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
