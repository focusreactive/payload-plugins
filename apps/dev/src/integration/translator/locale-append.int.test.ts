import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Guards an undocumented Payload behaviour: after each task settles it re-reads the job row onto the
// live `job` object, which is how a locale appended mid-run reaches the handler. Measured on 3.84.1;
// peer floor is ^3.76.0.

type Job = {
  id: string | number;
  completedAt?: string | null;
  input?: { target_lngs?: string[] };
  log?: Array<{ state: string; input?: { target_lng?: string } }>;
};

const tr = (locale: string, value: string) => (value.trim() ? `${locale}:${value}` : value);

let ctx: TestPayload;
let held: (() => void) | undefined;
let heldStarted: (() => void) | undefined;
const heldReached = new Promise<void>((resolve) => {
  heldStarted = resolve;
});

beforeAll(async () => {
  ctx = await bootTestPayload({
    // Pinned off: a running job is only extended without the host's concurrency control — the other
    // mode is `exclusive-queue.int.test.ts`.
    exclusiveQueue: false,
    runner: createPayloadJobsRunner({ autoRun: false }),
    onTranslate: async (targetLng) => {
      if (targetLng !== "fr") return;
      heldStarted?.();
      await new Promise<void>((resolve) => {
        held = resolve;
      });
    },
  });
});
afterAll(async () => {
  held?.();
  await ctx?.cleanup();
});

const readJob = async (): Promise<Job> => {
  const { docs } = await ctx.payload.find({
    collection: "payload-jobs" as "pages",
    pagination: false,
    where: { workflowSlug: { equals: "translate_document_locales" } } as never,
  });
  return docs[0] as Job;
};

describe("adding a locale to a running job", () => {
  it("reaches the handler, and the log written before it survives", async () => {
    const doc = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Append source", _status: "published" } as never,
    });
    const id = String(doc.id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });

    const run = ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });
    await heldReached;

    // The surviving-log claim is vacuous unless the log is non-empty when the second request lands.
    const before = await readJob();
    expect(
      (before.log ?? []).map((e) => e.input?.target_lng),
      "fixture: de should already be logged when the second request lands"
    ).toEqual(["de"]);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["es"],
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });

    held?.();
    await run;

    const after = await readJob();
    const logged = (after.log ?? []).map((e) => [e.input?.target_lng, e.state]);

    const esTitle = (
      (await ctx.payload.findByID({
        collection: "docs" as "pages",
        id,
        locale: "es" as "en",
        fallbackLocale: false,
        draft: true,
      })) as Record<string, unknown>
    ).title;

    expect(
      logged.map((l) => l[0]),
      "the appended locale never ran"
    ).toEqual(["de", "fr", "es"]);
    expect(esTitle, "the appended locale was not translated").toBe(tr("es", "Append source"));

    const { totalDocs } = await ctx.payload.count({
      collection: "payload-jobs" as "pages",
      where: { workflowSlug: { equals: "translate_document_locales" } } as never,
    });
    expect(totalDocs, "a second job was queued alongside the running one").toBe(1);
  });
});
