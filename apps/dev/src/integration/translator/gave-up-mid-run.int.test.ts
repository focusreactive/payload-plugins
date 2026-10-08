import {
  createPayloadJobsRunner,
  TranslationProviderError,
} from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const ATTEMPTS = 2;
/** Enough passes that the run is finished with one way or another before anything is read. */
const DRAIN = 8;

type Seen = { targetLng: string };

const onCompleted = vi.fn<(task: Seen) => void>();
const onFailed = vi.fn<(task: Seen, error: unknown) => void>();

let ctx: TestPayload;
let frHasFailedOnce = false;

describe("a run that spends its attempts across more than one locale", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: { attempts: ATTEMPTS, backoff: { type: "fixed", delay: 0 } },
      }),
      lifecycle: { onCompleted, onFailed },
      onTranslate: (targetLng) => {
        if (targetLng === "fr" && !frHasFailedOnce) {
          frHasFailedOnce = true;
          throw new Error("provider down");
        }
        if (targetLng === "de") throw new Error("provider down");
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("reports the locale it abandoned, not only the one that spent its own budget", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Spread thin", note: "A note" },
    });
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["fr", "de"],
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    for (let pass = 0; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }

    expect(onCompleted.mock.calls.map(([t]) => t.targetLng)).toEqual(["fr"]);
    expect(
      onFailed.mock.calls.map(([t]) => t.targetLng),
      "the run is over and de was never translated — silence here leaves it in flight forever"
    ).toEqual(["de"]);
    expect(
      onFailed.mock.calls[0]?.[1],
      "a host matches on the plugin's exported error classes; Payload's message-only copy is not one"
    ).toBeInstanceOf(TranslationProviderError);
  });
});
