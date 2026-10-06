import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Seen = { targetLng: string; jobId?: string; attempt?: number };

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

const enqueue = (id: string, targetLng: string) =>
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

const jobsOf = (res: { data: unknown }) =>
  (res.data as { data: { jobs: { target_lng: string; job_id: string }[] } }).data.jobs;

const callbackJobIds = (calls: [Seen][]) =>
  Object.fromEntries(calls.map(([task]) => [task.targetLng, task.jobId]));

describe("a locale added to a job already in flight", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false }),
      lifecycle: { onCompleted, onFailed },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("reports the live job in the response, and the same id in the callback, with no cross-talk", async () => {
    onCompleted.mockClear();
    const id = await create("Extended");

    const first = jobsOf(await enqueue(id, "de"));
    const second = jobsOf(await enqueue(id, "fr"));

    expect(
      second[0]?.job_id,
      "fr joined the job de already had — a new id here would be a lie"
    ).toBe(first[0]?.job_id);

    await ctx.payload.jobs.run({ queue: "translations" });

    const byLocale = callbackJobIds(onCompleted.mock.calls);
    expect(byLocale.de, "the first run's locale keeps its own reporting").toBe(first[0]?.job_id);
    expect(byLocale.fr).toBe(second[0]?.job_id);
  });
});
