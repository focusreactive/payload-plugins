import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// `createPayloadJobsRunner({ autoRun: false })` rather than the suite's default sync runner: only an
// unprocessed queue leaves a run unsettled between requests.

let ctx: TestPayload;

type Answer = {
  queued: number;
  busy?: string[];
  refused?: string[];
  assignments?: Array<{ handle: string; target_lng: string; collection_id: string }>;
};

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const enqueue = async (ids: string[], locales: string[]): Promise<Answer> => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: ids,
      publish_on_translation: false,
    },
  });
  return (res.data as { data: Answer }).data;
};

const german = async (id: string): Promise<unknown> => {
  const doc = (await ctx.payload.findByID({
    collection: "docs",
    id,
    locale: "de",
    fallbackLocale: false,
    draft: true,
  })) as Record<string, unknown>;
  return doc.title;
};

describe("one run per document at a time", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("turns away a second request while the first run is still owed", async () => {
    const id = await create("Asked twice in a row");

    await enqueue([id], ["de"]);
    const second = await enqueue([id], ["fr"]);

    expect(second.queued).toBe(0);
    expect(second.busy).toEqual([id]);
    expect(second.assignments ?? []).toEqual([]);
  });

  it("leaves the first run to finish, and it does", async () => {
    const id = await create("The first run wins");
    await enqueue([id], ["de"]);
    await enqueue([id], ["fr"]);

    await ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

    expect(await german(id), "the run that was accepted translated its locale").toBe(
      "de:The first run wins"
    );
  });

  it("takes the document again once its run has settled", async () => {
    const id = await create("Free again afterwards");
    await enqueue([id], ["de"]);
    await ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

    const again = await enqueue([id], ["fr"]);

    expect(again.queued).toBe(1);
    expect(again.busy).toBeUndefined();
  });

  it("queues the free documents of a bulk request and names only the busy one", async () => {
    const busy = await create("Busy in a bulk request");
    const free = await create("Free in the same request");
    await enqueue([busy], ["de"]);

    const bulk = await enqueue([busy, free], ["fr"]);

    expect(bulk.busy).toEqual([busy]);
    expect(bulk.assignments?.map((a) => a.collection_id)).toEqual([free]);
  });

  it("frees the document again after its run is cancelled", async () => {
    const id = await create("Cancelled, then asked again");
    const first = await enqueue([id], ["de"]);
    const handle = first.assignments?.[0]?.handle;

    await callEndpoint(ctx.payload, "delete", "/translate/cancel", { body: { ids: [handle] } });
    const again = await enqueue([id], ["de"]);

    expect(again.queued, "cancelling is the way out of a run that will not finish").toBe(1);
  });
});
