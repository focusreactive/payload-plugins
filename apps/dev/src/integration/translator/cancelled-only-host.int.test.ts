import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Seen = { collection: string; id: string; targetLng: string; jobId?: string };

const onCancelled = vi.fn<(task: Seen) => void>();

let ctx: TestPayload;

describe("a host that registers only onCancelled", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false }),
      lifecycle: { onCancelled },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("is told what stopped, once per locale, with the document named", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "To be cancelled", note: "A note" },
    });
    const id = String(made.id);

    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: true,
      },
    });
    const jobs = (res.data as { data: { jobs: { job_id: string }[] } }).data.jobs;
    const jobId = jobs[0]?.job_id;

    onCancelled.mockClear();
    await callEndpoint(ctx.payload, "delete", "/translate/cancel", { body: { ids: [jobId] } });

    expect(
      onCancelled.mock.calls.map(([task]) => task.targetLng).sort(),
      "both locales of the cancelled job were translations the host was tracking"
    ).toEqual(["de", "fr"]);
    expect(onCancelled.mock.calls[0]?.[0]).toMatchObject({
      collection: "docs",
      id,
      jobId,
    });
  });
});
