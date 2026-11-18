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
const onAbandoned = vi.fn<(task: Seen) => void>();
const onCancelled = vi.fn<(task: Seen) => void>();

const localesOf = (fn: typeof onFailed | typeof onAbandoned) =>
  fn.mock.calls.map(([task]) => task.targetLng).sort();

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
      lifecycle: { onFailed, onAbandoned, onCancelled },
      onTranslate: () => {
        throw new Error("provider down");
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("has nothing left to cancel: every locale settled when the run gave up", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Spent", note: "A note" },
    });
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [String(made.id)],

        publish_on_translation: false,
      },
    });
    for (let pass = 0; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }
    expect(
      localesOf(onFailed),
      "the run must be spent before the cancellation this check is about: de is what it tried"
    ).toEqual(["de"]);
    expect(
      localesOf(onAbandoned),
      "...and fr is what it never reached, so both are settled and neither is owed"
    ).toEqual(["fr"]);
    onCancelled.mockClear();

    // A settled run is not live, so neither shape of the route reaches it. Whether a run that IS
    // reached re-announces a settled locale is `owedOnCancel`'s rule, and has its own unit test.
    await callEndpoint(ctx.payload, "delete", "/translate/cancel", {
      body: { collection_slug: "docs", collection_id: [String(made.id)] },
    });
    await callEndpoint(ctx.payload, "delete", "/translate/cancel", {
      body: { collection_slug: "docs", select_all: true },
    });

    expect(onCancelled.mock.calls.map(([task]) => task.targetLng)).toEqual([]);
  });
});
