import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const RETRIES = 1;

let ctx: TestPayload;
let providerIsDown = true;
let docId = "";
let firstJobId: string | undefined;
let secondJobId: string | undefined;

const enqueue = async (): Promise<string | undefined> => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: "docs",
      collection_id: [docId],
      strategy: "overwrite",
      publish_on_translation: true,
    },
  });
  return (res.data as { data: { jobs: { job_id: string }[] } }).data.jobs[0]?.job_id;
};

describe("asking again for a locale whose job already gave up", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: { attempts: RETRIES, backoff: { type: "fixed", delay: 0 } },
      }),
      onTranslate: () => {
        if (providerIsDown) throw new Error("provider down");
      },
    });

    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Abandoned", note: "A note" },
    });
    docId = String(made.id);

    firstJobId = await enqueue();
    for (let run = 0; run <= RETRIES; run++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }

    providerIsDown = false;
    secondJobId = await enqueue();
    await ctx.payload.jobs.run({ queue: "translations" });
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("leaves the first job marked as having given up, with no completion date", async () => {
    const dead = await ctx.payload.findByID({ collection: "payload-jobs", id: firstJobId ?? "" });

    expect(
      (dead as { hasError?: boolean }).hasError,
      "this is the row Payload's picker will never take again"
    ).toBe(true);
    expect(
      (dead as { completedAt?: string | null }).completedAt ?? null,
      "and it stays in the plugin's live set, which is what made it a tempting host"
    ).toBeNull();
  });

  it("answers with a new job rather than the one that gave up", () => {
    expect(secondJobId).toBeTruthy();
    expect(secondJobId, "naming the abandoned job would promise work nothing runs").not.toBe(
      firstJobId
    );
  });

  it("actually translates the locale on the second ask", async () => {
    const doc = await ctx.payload.findByID({ collection: "docs", id: docId, locale: "de" });

    expect((doc as { title?: string }).title).toBe("de:Abandoned");
  });
});
