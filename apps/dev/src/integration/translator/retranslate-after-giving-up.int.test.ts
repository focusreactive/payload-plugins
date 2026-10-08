import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const RETRIES = 1;
const PASSES_UNTIL_THE_RUN_GIVES_UP = RETRIES + 1;

type Assignment = { target_lng: string; handle: string };

let ctx: TestPayload;
let providerIsDown = true;

const enqueue = async (id: string, locales: string[]): Promise<Assignment[]> => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: false,
    },
  });
  return (res.data as { data: { assignments?: Assignment[] } }).data.assignments ?? [];
};

describe("asking again after a run has given up", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: { attempts: RETRIES, backoff: { type: "fixed", delay: 0 } },
      }),
      onTranslate: (targetLng) => {
        if (targetLng === "de" && providerIsDown) throw new Error("provider down");
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("names a run that will really translate the locale, not the one that stopped", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Asked again", note: "A note" },
    });
    const id = String(made.id);

    const first = await enqueue(id, ["de"]);
    for (let pass = 0; pass < PASSES_UNTIL_THE_RUN_GIVES_UP; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }

    providerIsDown = false;
    const second = await enqueue(id, ["de"]);
    await ctx.payload.jobs.run({ queue: "translations" });

    expect(
      second[0]?.handle,
      "the first run is spent — Payload will never pick it up again, so naming it promises nothing"
    ).not.toBe(first[0]?.handle);
    const translated = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    expect(translated.title, "and the locale is actually translated").not.toBe("Asked again");
  });
});
