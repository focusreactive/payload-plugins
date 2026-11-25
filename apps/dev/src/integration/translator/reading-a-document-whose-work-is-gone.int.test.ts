import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * Every other spec reaches its state by enqueueing, so a queue row exists by construction. This
 * one takes the work away and leaves the records open — the state a document is left in when the
 * process holding it was killed. One spec already cancels from here; nothing reads from here, and
 * reading is what the panel does every twenty seconds.
 */
let ctx: TestPayload;

type Run = { status: string } | null;
type DocumentState = { locales: { locale: string; run: Run }[] };
type ListState = { docs: { id: string; locales: { locale: string; run: Run }[] }[] };

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

const runStatusesOf = (locales: { locale: string; run: Run }[]): string[] =>
  locales.filter((one) => one.run !== null).map((one) => `${one.locale}:${one.run?.status}`);

describe("reading a document whose run record outlived its work", () => {
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Left behind" },
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
    await ctx.payload.delete({ collection: "payload-jobs", where: {}, overrideAccess: true });
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("starts from a document held by records nothing will ever close", async () => {
    expect({ open: await openRunsFor(id), queued: await queueRows() }).toStrictEqual({
      open: 2,
      queued: 0,
    });
  });

  it("answers the document state, naming the run each locale is still held by", async () => {
    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document-state/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );

    expect(res.status).toBe(200);
    expect(runStatusesOf((res.data as { data: DocumentState }).data.locales).sort()).toStrictEqual([
      "de:queued",
      "fr:queued",
    ]);
  });

  it("answers the list state for the same document", async () => {
    const res = await callEndpoint(ctx.payload, "get", "/translate/list-state/:collection_slug", {
      routeParams: { collection_slug: "docs" },
      query: `ids=${id}`,
    });

    expect(res.status).toBe(200);
    const listed = (res.data as { data: ListState }).data.docs.find((one) => one.id === id);
    expect(runStatusesOf(listed?.locales ?? []).sort()).toStrictEqual(["de:queued", "fr:queued"]);
  });
});
