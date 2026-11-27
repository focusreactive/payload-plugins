import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Its own file because `getPayload` caches one instance per process, and this boot needs Payload's
// own `deleteJobOnComplete: true` rather than the suite's `false`.

const RUNS = "translator-runs";

const create = async (ctx: TestPayload, title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const enqueue = (ctx: TestPayload, id: string, locales: string[]) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: [id],
      publish_on_translation: false,
    },
  });

const rowsFor = async (
  ctx: TestPayload,
  id: string
): Promise<Array<{ handle: string; outcome: string | null }>> => {
  const found = await ctx.payload.find({
    collection: RUNS,
    where: {
      and: [{ collectionSlug: { equals: "docs" } }, { collectionId: { equals: id } }],
    },
    limit: 100,
    pagination: false,
  });
  return found.docs as unknown as Array<{ handle: string; outcome: string | null }>;
};

describe("the run record outlives the job, on Payload's own default", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false }),
      deleteJobOnComplete: true,
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("still says delivered after Payload has deleted the job row", async () => {
    const id = await create(ctx, "A document whose job will be deleted");
    await enqueue(ctx, id, ["de"]);

    await ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

    const [row] = await rowsFor(ctx, id);
    const jobs = await ctx.payload.find({
      collection: "payload-jobs" as "docs",
      where: { id: { equals: row.handle } } as never,
      pagination: false,
    });
    expect(jobs.docs, "Payload's default removes the job once it completes").toHaveLength(0);
    expect(row.outcome, "the plugin's own row is what survives").toBe("delivered");
  });
});
