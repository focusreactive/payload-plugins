import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, Where } from "payload";

import { PayloadJobsTaskRunner } from "../PayloadJobsTaskRunner.js";
import type { PayloadJobsRunnerConfig, PayloadJob } from "../types.js";

const config: PayloadJobsRunnerConfig = {
  taskName: "translate_document",
  workflowName: "translate_document_locales",
  queueName: "translations",
  jobsCollection: "payload-jobs",
  autoRun: { cron: "* * * * *", limit: 50 },
  staleJobTimeoutMs: 300_000,
};

const job = (id: string, targetLngs: string[]): PayloadJob => ({
  id,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  processing: false,
  input: {
    collection_slug: "posts",
    collection_id: "doc-1",
    source_lng: "en",
    target_lngs: targetLngs,
    strategy: "overwrite",
    publish_on_translation: false,
    requester_id: null,
    requester_collection: null,
  },
});

describe("PayloadJobsTaskRunner.findByIds — resolving ids back to what they stand for", () => {
  let mockPayload: { find: ReturnType<typeof vi.fn> };
  let runner: PayloadJobsTaskRunner;

  beforeEach(() => {
    mockPayload = { find: vi.fn().mockResolvedValue({ docs: [] }) };
    runner = new PayloadJobsTaskRunner(mockPayload as unknown as Payload, config);
  });

  it("expands one row into one task per target locale", async () => {
    mockPayload.find.mockResolvedValue({ docs: [job("job-77", ["de", "fr", "it"])] });

    const tasks = await runner.findByIds(["job-77"]);

    expect(
      tasks.map((task) => task.input.targetLng),
      "a row holds a locale LIST, and a cancellation stops every one of them"
    ).toEqual(["de", "fr", "it"]);
    expect(new Set(tasks.map((task) => task.id)), "all three ride the one row").toEqual(
      new Set(["job-77"])
    );
    expect(tasks[0]?.input.collectionId).toBe("doc-1");
  });

  it("asks only for this plugin's own jobs, so a foreign id resolves to nothing", async () => {
    await runner.findByIds(["someone-elses-job"]);

    const where = (mockPayload.find.mock.calls[0][0] as { where: { and: Where[] } }).where;
    const narrowing = JSON.stringify(where);

    expect(narrowing, "the plugin's own workflow slug must be part of the query").toContain(
      "translate_document_locales"
    );
    expect(narrowing).toContain("someone-elses-job");
  });

  it("reads nothing and asks nothing for an empty list", async () => {
    expect(await runner.findByIds([])).toEqual([]);
    expect(mockPayload.find).not.toHaveBeenCalled();
  });

  it("answers with nothing when the ids match no row", async () => {
    expect(await runner.findByIds(["gone"])).toEqual([]);
  });
});
