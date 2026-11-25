import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * Cancelling writes to the queue's own rows. A host that registers a jobs hook makes Payload
 * validate those writes, and that is how the owner's installation runs — the same arrangement that
 * turned a finished translation into a reported failure. Only the bookkeeping path was probed
 * under it; this is the cancel path.
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

const queueRows = async (): Promise<number> => {
  const found = await ctx.payload.find({
    collection: "payload-jobs",
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return found.docs.length;
};

describe("cancelling while the host validates its own job rows", () => {
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      runHooks: true,
      runner: createPayloadJobsRunner({ autoRun: false }),
      lifecycle: { onCancelled },
    });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "A title" },
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
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("closes every record as cancelled and takes the queued work away", async () => {
    expect(
      { open: await openRunsFor(id), queued: await queueRows() },
      "the document starts out held by two open records, behind one queued job"
    ).toStrictEqual({ open: 2, queued: 1 });

    const response = await callEndpoint(ctx.payload, "delete", "/translate/cancel", {
      body: { collection_slug: "docs", collection_id: [id] },
    });

    expect(response.status).toBe(204);
    /*
     * The queue row is read as well as the records: a cancel that closed the records and left the
     * work behind would still answer 204, and a worker could pick the job up afterwards.
     */
    expect({
      open: await openRunsFor(id),
      queued: await queueRows(),
      outcomes: await outcomesFor(id),
    }).toStrictEqual({ open: 0, queued: 0, outcomes: ["cancelled", "cancelled"] });
  });

  it("tells the host what became of each locale", () => {
    expect(onCancelled.mock.calls.map(([task]) => task.targetLng).sort()).toStrictEqual([
      "de",
      "fr",
    ]);
  });
});
