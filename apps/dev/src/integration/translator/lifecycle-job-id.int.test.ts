import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Seen = { targetLng: string; jobId?: string; attempt?: number };

const onQueued = vi.fn<(task: Seen) => void>();
const onCompleted = vi.fn<(task: Seen) => void>();
const onFailed = vi.fn<(task: Seen) => void>();

let ctx: TestPayload;

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const enqueue = (id: string, targetLng: string | string[]) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: targetLng,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: true,
    },
  });

const reportedJobs = (res: { data: unknown }) =>
  (res.data as { data: { jobs: { target_lng: string; job_id: string }[] } }).data.jobs;

describe("a lifecycle callback names the job that ran it", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false }),
      lifecycle: { onQueued, onCompleted, onFailed },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("gives onCompleted the same job id the enqueue response reported for that locale", async () => {
    onCompleted.mockClear();
    const id = await create("Matched");

    const reported = reportedJobs(await enqueue(id, ["de", "fr"]));
    await ctx.payload.jobs.run({ queue: "translations" });

    const byLocale = Object.fromEntries(
      onCompleted.mock.calls.map(([task]) => [task.targetLng, task.jobId])
    );
    for (const job of reported) {
      expect(
        byLocale[job.target_lng],
        `the callback for ${job.target_lng} must name the job the response promised`
      ).toBe(job.job_id);
    }
  });

  it("gives onCompleted the attempt it ran on", async () => {
    onCompleted.mockClear();
    const id = await create("Attempted");

    await enqueue(id, "de");
    await ctx.payload.jobs.run({ queue: "translations" });

    expect(onCompleted.mock.calls[0]?.[0].attempt, "a first run is attempt 1, not 0").toBe(1);
  });

  it("does not pretend onQueued knows a job id — the job does not exist yet", async () => {
    onQueued.mockClear();
    const id = await create("Too early");

    await enqueue(id, "de");

    expect(onQueued).toHaveBeenCalled();
    expect(onQueued.mock.calls[0]?.[0].jobId).toBeUndefined();
  });
});
