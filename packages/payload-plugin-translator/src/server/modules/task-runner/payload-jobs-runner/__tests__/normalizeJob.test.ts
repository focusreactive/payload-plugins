import { describe, it, expect } from "vitest";
import type { CollectionSlug } from "payload";
import { normalizeJob, normalizeJobLocales } from "../store/normalizeJob.js";
import { runTargets } from "../store/runTargets.js";
import type { PayloadJob } from "../store/types.js";

describe("normalizeJob", () => {
  const baseJob: PayloadJob = {
    id: "job-123",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    input: {
      collection: {
        relationTo: "posts" as CollectionSlug,
        value: "doc-456",
      },
      source_lng: "en",
      target_lng: "de",
    },
  };

  describe("basic transformation", () => {
    it("transforms job to task with correct id", () => {
      const task = normalizeJob(baseJob);
      expect(task.id).toBe("job-123");
    });

    it("transforms job to task with correct input", () => {
      const task = normalizeJob(baseJob);
      expect(task.input).toEqual({
        collectionSlug: "posts",
        collectionId: "doc-456",
        sourceLng: "en",
        targetLng: "de",
        publishOnTranslation: false,
      });
    });

    it("transforms job to task with correct timestamps", () => {
      const task = normalizeJob(baseJob);
      expect(task.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(task.updatedAt).toBe("2024-01-01T00:00:00Z");
    });
  });

  describe("id-agnostic shape handling", () => {
    it("reads the new flat-text reference shape", () => {
      const job: PayloadJob = {
        ...baseJob,
        input: {
          collection_slug: "posts",
          collection_id: "doc-789",
          source_lng: "en",
          target_lng: "de",
        },
      };
      const task = normalizeJob(job);
      expect(task.input.collectionSlug).toBe("posts");
      expect(task.input.collectionId).toBe("doc-789");
    });

    it("falls back to the legacy relationship shape, coercing the id to a string", () => {
      const job: PayloadJob = {
        ...baseJob,
        input: {
          collection: { relationTo: "posts" as CollectionSlug, value: 5 },
          source_lng: "en",
          target_lng: "de",
        },
      };
      const task = normalizeJob(job);
      expect(task.input.collectionSlug).toBe("posts");
      expect(task.input.collectionId).toBe("5");
    });

    it("prefers the new shape over the legacy shape when both are present", () => {
      const job: PayloadJob = {
        ...baseJob,
        input: {
          collection_slug: "pages",
          collection_id: "new-id",
          collection: {
            relationTo: "posts" as CollectionSlug,
            value: "legacy-id",
          },
          source_lng: "en",
          target_lng: "de",
        },
      };
      const task = normalizeJob(job);
      expect(task.input.collectionSlug).toBe("pages");
      expect(task.input.collectionId).toBe("new-id");
    });
  });

  describe("status detection", () => {
    it("returns pending status for new job", () => {
      const task = normalizeJob(baseJob);
      expect(task.status).toBe("pending");
    });

    it("returns running status when processing is true", () => {
      const job: PayloadJob = { ...baseJob, processing: true };
      const task = normalizeJob(job);
      expect(task.status).toBe("running");
    });

    it("returns completed status when completedAt is set", () => {
      const job: PayloadJob = {
        ...baseJob,
        completedAt: "2024-01-01T01:00:00Z",
      };
      const task = normalizeJob(job);
      expect(task.status).toBe("completed");
      expect(task.completedAt).toBe("2024-01-01T01:00:00Z");
    });

    it("returns failed status once the queue has given up", () => {
      const job: PayloadJob = {
        ...baseJob,
        error: { message: "Something went wrong" },
        hasError: true,
      };
      const task = normalizeJob(job);
      expect(task.status).toBe("failed");
    });

    it("completed takes precedence over processing", () => {
      const job: PayloadJob = {
        ...baseJob,
        completedAt: "2024-01-01T01:00:00Z",
        processing: true,
      };
      const task = normalizeJob(job);
      expect(task.status).toBe("completed");
    });

    it("completed takes precedence over error", () => {
      const job: PayloadJob = {
        ...baseJob,
        completedAt: "2024-01-01T01:00:00Z",
        error: { message: "err" },
      };
      const task = normalizeJob(job);
      expect(task.status).toBe("completed");
    });
  });

  describe("error handling", () => {
    it("extracts error message from error object", () => {
      const job: PayloadJob = {
        ...baseJob,
        error: { message: "Translation failed" },
      };
      const task = normalizeJob(job);
      expect(task.error).toEqual({ message: "Translation failed" });
    });

    it("returns unknown error for non-standard error", () => {
      const job: PayloadJob = { ...baseJob, error: "some string error" };
      const task = normalizeJob(job);
      expect(task.error).toEqual({ message: "Unknown error" });
    });

    it("returns unknown error for error without message", () => {
      const job: PayloadJob = { ...baseJob, error: { code: 500 } };
      const task = normalizeJob(job);
      expect(task.error).toEqual({ message: "Unknown error" });
    });

    it("sets error to undefined when no error", () => {
      const task = normalizeJob(baseJob);
      expect(task.error).toBeUndefined();
    });
  });

  describe("cancelled detection", () => {
    it("detects cancelled job", () => {
      const job: PayloadJob = {
        ...baseJob,
        error: { cancelled: true, message: "Cancelled" },
      };
      const task = normalizeJob(job);
      expect(task.cancelled).toBe(true);
    });

    it("returns false for non-cancelled error", () => {
      const job: PayloadJob = { ...baseJob, error: { message: "Failed" } };
      const task = normalizeJob(job);
      expect(task.cancelled).toBe(false);
    });

    it("returns false for cancelled: false", () => {
      const job: PayloadJob = {
        ...baseJob,
        error: { cancelled: false, message: "Error" },
      };
      const task = normalizeJob(job);
      expect(task.cancelled).toBe(false);
    });

    it("returns false for no error", () => {
      const task = normalizeJob(baseJob);
      expect(task.cancelled).toBe(false);
    });
  });

  describe("missing input fields", () => {
    it("handles missing input gracefully", () => {
      const job: PayloadJob = { ...baseJob, input: undefined };
      const task = normalizeJob(job);
      expect(task.input).toEqual({
        collectionSlug: "",
        collectionId: "",
        sourceLng: "",
        targetLng: "",
        publishOnTranslation: false,
      });
    });

    it("handles missing collection in input", () => {
      const job: PayloadJob = {
        ...baseJob,
        input: { source_lng: "en", target_lng: "de" },
      };
      const task = normalizeJob(job);
      expect(task.input.collectionSlug).toBe("");
      expect(task.input.collectionId).toBe("");
    });

    it("reads a run written before 1.0 as one target per listed locale", () => {
      const job: PayloadJob = {
        ...baseJob,
        input: { ...baseJob.input, targets: undefined, target_lngs: ["de", "fr"] },
      };

      expect(normalizeJobLocales(job).map((task) => task.input.targetLng)).toEqual(["de", "fr"]);
    });

    it("carries a pre-1.0 skip_existing run's intent over as the drift criterion", () => {
      const job: PayloadJob = {
        ...baseJob,
        input: {
          ...baseJob.input,
          targets: undefined,
          target_lngs: ["de"],
          strategy: "skip_existing",
        },
      };

      expect(runTargets(job.input)).toEqual([
        { lng: "de", filters: [{ kind: "rule", name: "stale" }] },
      ]);
    });
  });

  describe("completedAt handling", () => {
    it("sets completedAt to undefined when null", () => {
      const job: PayloadJob = { ...baseJob, completedAt: null };
      const task = normalizeJob(job);
      expect(task.completedAt).toBeUndefined();
    });

    it("sets completedAt to value when provided", () => {
      const job: PayloadJob = {
        ...baseJob,
        completedAt: "2024-01-02T00:00:00Z",
      };
      const task = normalizeJob(job);
      expect(task.completedAt).toBe("2024-01-02T00:00:00Z");
    });
  });
});

describe("normalizeJobLocales", () => {
  const workflowJob: PayloadJob = {
    id: "job-999",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:05:00Z",
    input: {
      collection_slug: "posts",
      collection_id: "doc-456",
      source_lng: "en",
      targets: [
        { lng: "de", filters: [] },
        { lng: "fr", filters: [] },
        { lng: "es", filters: [] },
      ],
    },
  };

  it("expands a pre-workflow job to itself", () => {
    const legacy: PayloadJob = {
      id: "job-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      input: { collection_slug: "posts", collection_id: "doc-1", target_lng: "de" },
    };
    const rows = normalizeJobLocales(legacy);
    expect(rows).toEqual([normalizeJob(legacy)]);
  });

  it("gives every requested locale a row, in the requested order", () => {
    const rows = normalizeJobLocales(workflowJob);
    expect(rows.map((r) => r.input.targetLng)).toEqual(["de", "fr", "es"]);
  });

  it("does not call a locale failed while its run is still retrying", () => {
    const [de] = normalizeJobLocales({
      ...workflowJob,
      input: { ...workflowJob.input, targets: [{ lng: "de", filters: [] }] },
      log: [{ state: "failed", input: { target_lng: "de" } }],
    } as PayloadJob);

    expect(
      de?.status,
      "a locale whose last attempt failed but which will be tried again is still work in flight"
    ).toBe("pending");
  });

  it("calls a locale failed once its run has given up", () => {
    const [de] = normalizeJobLocales({
      ...workflowJob,
      input: { ...workflowJob.input, targets: [{ lng: "de", filters: [] }] },
      error: { message: "boom" },
      hasError: true,
      log: [{ state: "failed", input: { target_lng: "de" } }],
    } as PayloadJob);

    expect(de?.status).toBe("failed");
  });

  it("takes a locale's success from its own log entry, not from the job's status", () => {
    const rows = normalizeJobLocales({
      ...workflowJob,
      processing: true,
      log: [
        { state: "succeeded", completedAt: "2024-01-01T00:01:00Z", input: { target_lng: "de" } },
        { state: "failed", completedAt: "2024-01-01T00:02:00Z", input: { target_lng: "fr" } },
      ],
    });
    expect(
      rows.map((r) => [r.input.targetLng, r.status]),
      "de finished on its own evidence; fr's attempt failed but the run has not given up, so it is still running"
    ).toEqual([
      ["de", "completed"],
      ["fr", "running"],
      ["es", "running"],
    ]);
  });

  it("keeps a finished locale finished even once the run gives up", () => {
    const rows = normalizeJobLocales({
      ...workflowJob,
      error: { message: "boom" },
      hasError: true,
      log: [
        { state: "succeeded", completedAt: "2024-01-01T00:01:00Z", input: { target_lng: "de" } },
        { state: "failed", completedAt: "2024-01-01T00:02:00Z", input: { target_lng: "fr" } },
      ],
    });
    expect(rows.map((r) => [r.input.targetLng, r.status])).toEqual([
      ["de", "completed"],
      ["fr", "failed"],
      ["es", "failed"],
    ]);
  });

  it("stamps completedAt only on a locale that succeeded", () => {
    const rows = normalizeJobLocales({
      ...workflowJob,
      log: [
        { state: "succeeded", completedAt: "2024-01-01T00:01:00Z", input: { target_lng: "de" } },
        { state: "failed", completedAt: "2024-01-01T00:02:00Z", input: { target_lng: "fr" } },
      ],
    });
    expect(rows[0].completedAt).toBe("2024-01-01T00:01:00Z");
    expect(rows[1].completedAt).toBeUndefined();
  });

  it("keeps the failure on the locale that failed, off the ones that landed", () => {
    const rows = normalizeJobLocales({
      ...workflowJob,
      error: { message: "provider refused fr" },
      log: [
        { state: "succeeded", completedAt: "2024-01-01T00:01:00Z", input: { target_lng: "de" } },
        { state: "failed", completedAt: "2024-01-01T00:02:00Z", input: { target_lng: "fr" } },
      ],
    });
    expect(rows[0].error).toBeUndefined();
    expect(rows[1].error).toEqual({ message: "provider refused fr" });
  });

  it("takes a retried locale's most recent log entry", () => {
    const rows = normalizeJobLocales({
      ...workflowJob,
      input: { ...workflowJob.input, targets: [{ lng: "de", filters: [] }] },
      log: [
        { state: "failed", completedAt: "2024-01-01T00:01:00Z", input: { target_lng: "de" } },
        { state: "succeeded", completedAt: "2024-01-01T00:03:00Z", input: { target_lng: "de" } },
      ],
    });
    expect(rows[0].status).toBe("completed");
    expect(rows[0].completedAt).toBe("2024-01-01T00:03:00Z");
  });

  it("keeps the real job id on every row, because cancelling one cancels the job", () => {
    const rows = normalizeJobLocales(workflowJob);
    expect(rows.map((r) => r.id)).toEqual(["job-999", "job-999", "job-999"]);
  });
});
