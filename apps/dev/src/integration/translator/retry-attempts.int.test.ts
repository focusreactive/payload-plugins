import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const ATTEMPTS = 3;

type Seen = { targetLng: string; jobId?: string; attempt?: number };

const onCompleted = vi.fn<(task: Seen) => void>();
const onFailed = vi.fn<(task: Seen) => void>();

const attemptsOf = (fn: typeof onCompleted, targetLng: string) =>
  fn.mock.calls.filter(([task]) => task.targetLng === targetLng).map(([task]) => task.attempt);

let ctx: TestPayload;
let deCalls = 0;
let reportedJobIds: string[] = [];

describe("one job whose first locale fails twice and whose second locale never fails", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({
        autoRun: false,
        // The shipped default backs off exponentially from five seconds — a minute of waiting for a
        // spec about attempt counts.
        retries: { attempts: ATTEMPTS, backoff: { type: "fixed", delay: 0 } },
      }),
      lifecycle: { onCompleted, onFailed },
      onTranslate: (targetLng) => {
        if (targetLng !== "de") return;
        deCalls += 1;
        if (deCalls <= 2) throw new Error("provider down");
      },
    });

    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Flaky", note: "A note" },
    });

    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: true,
      },
    });
    reportedJobIds = (res.data as { data: { jobs: { job_id: string }[] } }).data.jobs.map(
      (job) => job.job_id
    );

    for (let run = 0; run < ATTEMPTS; run++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("reports attempts 1 and 2 on the failures", () => {
    expect(
      attemptsOf(onFailed, "de"),
      "without the attempt number these two callbacks are indistinguishable"
    ).toEqual([1, 2]);
  });

  it("reports attempt 3 on the run that finally worked", () => {
    expect(attemptsOf(onCompleted, "de").at(-1)).toBe(3);
  });

  it("reports the second locale's first run as attempt 1, though the job is on its third pass", () => {
    expect(
      attemptsOf(onCompleted, "fr"),
      "fr waited behind de and then succeeded outright — the job's two failed passes were not its"
    ).toEqual([1]);
  });

  it("names the same job on every attempt, so the host joins all of them to one request", () => {
    const ids = new Set([
      ...onFailed.mock.calls.map(([task]) => task.jobId),
      ...onCompleted.mock.calls.map(([task]) => task.jobId),
    ]);

    expect(ids.size, "one request, one job, four callbacks").toBe(1);
    expect(
      [...ids],
      "and it is the job the enqueue response named — bound directly, not inferred from the other callbacks"
    ).toEqual([...new Set(reportedJobIds)]);
  });
});
