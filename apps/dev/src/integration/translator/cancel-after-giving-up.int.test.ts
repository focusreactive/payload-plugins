import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Seen = { targetLng: string };
type Assignment = { target_lng: string; handle: string };

const ONE_ATTEMPT_SO_THE_RUN_GIVES_UP_AT_ONCE = 1;
/** Enough passes that the run is finished one way or another before anything is read. */
const DRAIN = 8;

const onFailed = vi.fn<(task: Seen, error: unknown) => void>();
const onCancelled = vi.fn<(task: Seen) => void>();

let ctx: TestPayload;

describe("cancelling a run that has already given up", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: {
          attempts: ONE_ATTEMPT_SO_THE_RUN_GIVES_UP_AT_ONCE,
          backoff: { type: "fixed", delay: 0 },
        },
      }),
      lifecycle: { onFailed, onCancelled },
      onTranslate: () => {
        throw new Error("provider down");
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("announces nothing: every locale was settled when the run gave up", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Spent", note: "A note" },
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
    const handle = ((res.data as { data: { assignments?: Assignment[] } }).data.assignments ??
      [])[0]?.handle;
    for (let pass = 0; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }
    expect(
      onFailed.mock.calls.map(([task]) => task.targetLng).sort(),
      "the run must be spent before the cancellation this check is about"
    ).toEqual(["de", "fr"]);

    await callEndpoint(ctx.payload, "delete", "/translate/cancel", { body: { ids: [handle] } });

    expect(
      onCancelled.mock.calls.map(([task]) => task.targetLng),
      "a locale already told it failed is settled; telling it again is a second ending"
    ).toEqual([]);
  });

  it("announces nothing when the whole collection is cancelled either", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Spent too", note: "A note" },
    });
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    for (let pass = 0; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }
    onCancelled.mockClear();

    await callEndpoint(ctx.payload, "delete", "/translate/cancel-by-collection/:collection_slug", {
      routeParams: { collection_slug: "docs" },
    });

    expect(
      onCancelled.mock.calls.map(([task]) => task.targetLng),
      "a spent run is neither completed nor running, so this sweep reaches it"
    ).toEqual([]);
  });
});
