import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * Every other cancel spec enqueues first, so a queue row always exists by construction. This one
 * takes the queue row away and leaves the run records open — the state a document is left in when
 * something removed the work without anyone recording what became of it.
 */
type Seen = { targetLng: string };

const onCancelled = vi.fn<(task: Seen) => void>();

let ctx: TestPayload;

const outcomesFor = async (id: string): Promise<Array<string | null | undefined>> => {
  const found = await ctx.payload.find({
    collection: "translator-runs",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: { collectionId: { equals: id } },
  });
  return found.docs.map((row) => (row as { outcome?: string | null }).outcome).sort();
};

const openRunsFor = async (id: string): Promise<number> => {
  const found = await ctx.payload.find({
    collection: "translator-runs",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: { and: [{ collectionId: { equals: id } }, { settledAt: { exists: false } }] },
  });
  return found.docs.length;
};

describe("cancelling a run whose queue row is already gone", () => {
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false }),
      lifecycle: { onCancelled },
    });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Left behind", note: "A note" },
    });
    id = String(made.id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [id],
        publish_on_translation: false,
      },
    });

    // What the sandbox was left with: the work is gone, the records still say it is under way.
    await ctx.payload.delete({ collection: "payload-jobs", where: {}, overrideAccess: true });
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("closes the run records, so the document stops reading as busy", async () => {
    expect(await openRunsFor(id), "the document starts out held by two open records").toBe(2);

    const response = await callEndpoint(ctx.payload, "delete", "/translate/cancel", {
      body: { collection_slug: "docs", collection_id: [id] },
    });

    expect(response.status).toBe(204);
    expect(
      { open: await openRunsFor(id), outcomes: await outcomesFor(id) },
      "a record nobody closes keeps the panel saying the document is translating, for ever"
    ).toStrictEqual({ open: 0, outcomes: ["cancelled", "cancelled"] });
  });

  it("tells the host what became of each locale", async () => {
    expect(onCancelled.mock.calls.map(([task]) => task.targetLng).sort()).toEqual(["de", "fr"]);
  });
});
