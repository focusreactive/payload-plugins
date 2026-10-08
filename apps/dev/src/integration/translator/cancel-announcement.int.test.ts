import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Seen = { targetLng: string; handle?: string };
type Assignment = { target_lng: string; handle: string };

const ATTEMPTS_SO_THE_RUN_STILL_HAS_A_TRY_LEFT = 3;

let ctx: TestPayload;

const runStillOnRecordWhenAnnounced: boolean[] = [];

const onCancelled = vi.fn(async (task: Seen) => {
  const row = await ctx.payload.find({
    collection: "payload-jobs" as "docs",
    where: { id: { equals: task.handle } } as never,
  });
  runStillOnRecordWhenAnnounced.push(row.docs.length === 1);
});

describe("cancelling announces what it stopped, to a host that registered nothing else", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: {
          attempts: ATTEMPTS_SO_THE_RUN_STILL_HAS_A_TRY_LEFT,
          backoff: { type: "fixed", delay: 0 },
        },
      }),
      lifecycle: { onCancelled },
      onTranslate: (targetLng) => {
        if (targetLng === "fr") throw new Error("provider down");
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("names every locale the run still owed, and no locale it had delivered", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Stopped midway", note: "A note" },
    });
    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr", "es"],
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    const handle = ((res.data as { data: { assignments?: Assignment[] } }).data.assignments ??
      [])[0]?.handle;
    await ctx.payload.jobs.run({ queue: "translations" });

    await callEndpoint(ctx.payload, "delete", "/translate/cancel", { body: { ids: [handle] } });

    expect(onCancelled.mock.calls.map(([task]) => task.targetLng).sort()).toEqual(["es", "fr"]);
    expect(
      onCancelled.mock.calls.every(([task]) => task.handle === handle),
      "each locale is announced against the run that was cancelled"
    ).toBe(true);
  });

  it("announces while the run is still on record", async () => {
    expect(
      runStillOnRecordWhenAnnounced,
      "a host told after the deletion could no longer look the run up"
    ).toEqual([true, true]);
  });
});
