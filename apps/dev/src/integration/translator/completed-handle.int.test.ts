import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Seen = { targetLng: string; handle?: string };
type Job = { target_lng: string; job_id: string };

const onCompleted = vi.fn<(task: Seen) => void>();

let ctx: TestPayload;

describe("the handle the enqueue answer named is the handle onCompleted carries", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false }),
      lifecycle: { onCompleted },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("matches for every locale of the request", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Two locales", note: "A note" },
    });
    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    const promised = (res.data as { data: { jobs?: Job[] } }).data.jobs ?? [];

    await ctx.payload.jobs.run({ queue: "translations" });

    const delivered = onCompleted.mock.calls.map(([task]) => task);
    expect(delivered.map((t) => t.targetLng).sort()).toEqual(["de", "fr"]);
    for (const task of delivered) {
      expect(
        task.handle,
        `the caller was told ${task.targetLng} would run as a named job; it has to be that job`
      ).toBe(promised.find((j) => j.target_lng === task.targetLng)?.job_id);
    }
  });
});
