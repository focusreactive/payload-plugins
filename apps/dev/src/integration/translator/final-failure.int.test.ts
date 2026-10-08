import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const ATTEMPTS = 2;
const PASSES_UNTIL_THE_RUN_GIVES_UP = ATTEMPTS + 1;

type Seen = { targetLng: string; handle?: string };

const onCompleted = vi.fn<(task: Seen) => void>();
const onFailed = vi.fn<(task: Seen) => void>();

const localesOf = (fn: typeof onFailed) => fn.mock.calls.map(([t]) => t.targetLng).sort();

let ctx: TestPayload;
let providerIsDown = true;

describe("onFailed reports a final outcome, not an attempt", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({
        autoRun: false,
        // The shipped default backs off exponentially from five seconds; this spec would then be
        // minutes of waiting.
        retries: { attempts: ATTEMPTS, backoff: { type: "fixed", delay: 0 } },
      }),
      lifecycle: { onCompleted, onFailed },
      onTranslate: (targetLng) => {
        if (targetLng === "de" && providerIsDown) throw new Error("provider down");
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  const run = async (title: string, locales: string[]) => {
    onCompleted.mockClear();
    onFailed.mockClear();
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title, note: "A note" },
    });
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: locales,
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    for (let pass = 0; pass < PASSES_UNTIL_THE_RUN_GIVES_UP; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }
  };

  it("says nothing while the run is still retrying, and reports success once it works", async () => {
    providerIsDown = true;
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Flaky", note: "A note" },
    });
    onCompleted.mockClear();
    onFailed.mockClear();
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    await ctx.payload.jobs.run({ queue: "translations" });
    providerIsDown = false;
    await ctx.payload.jobs.run({ queue: "translations" });

    expect(
      onFailed,
      "a locale that failed once and then worked never failed, as far as the host is concerned"
    ).not.toHaveBeenCalled();
    expect(localesOf(onCompleted)).toEqual(["de"]);
  });

  it("reports every locale the run never got to, not just the one that broke", async () => {
    providerIsDown = true;

    await run("Abandoned", ["de", "fr"]);

    expect(
      localesOf(onFailed),
      "fr never started, because the run stopped at de — and it never will"
    ).toEqual(["de", "fr"]);
  });

  it("does not report a locale the run had already translated", async () => {
    providerIsDown = true;

    await run("Partly done", ["fr", "de"]);

    expect(localesOf(onCompleted), "fr went first and worked").toEqual(["fr"]);
    expect(localesOf(onFailed), "only de is owed").toEqual(["de"]);
  });
});
