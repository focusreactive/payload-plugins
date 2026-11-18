import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// `autoRun: false` rather than the suite's default sync runner, which settles every locale inside
// `enqueue`: only an unprocessed queue leaves work in flight to read.

let ctx: TestPayload;

type DocumentEntry = {
  id: string;
  status: string;
  input: { target_lng: string };
};

type CollectionEntry = { id: string; status: string; collection_id: string; target_lng: string };

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const enqueue = (id: string, locales: string[]) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: [id],
      publish_on_translation: false,
    },
  });

const documentStatus = async (id: string): Promise<DocumentEntry[]> => {
  const res = await callEndpoint(
    ctx.payload,
    "get",
    "/translate/document/:collection_slug/:collection_id",
    {
      routeParams: { collection_slug: "docs", collection_id: id },
    }
  );
  return (res.data as { data: DocumentEntry[] }).data;
};

const collectionStatus = async (): Promise<CollectionEntry[]> => {
  const res = await callEndpoint(ctx.payload, "get", "/translate/collection/:collection_slug", {
    routeParams: { collection_slug: "docs" },
  });
  return (res.data as { data: { docs: CollectionEntry[] } }).data.docs;
};

describe("the panels read the plugin's own record", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("shows a queued locale as pending before anything runs it", async () => {
    const id = await create("A document waiting in the queue");

    await enqueue(id, ["de", "fr"]);

    const entries = await documentStatus(id);
    expect(entries.map((e) => e.input.target_lng).sort()).toEqual(["de", "fr"]);
    expect(entries.every((e) => e.status === "pending")).toBe(true);
  });

  it("shows the same work on the collection panel", async () => {
    const id = await create("A document the collection panel must see");

    await enqueue(id, ["de"]);

    const entries = await collectionStatus();
    expect(entries.some((e) => e.collection_id === id && e.status === "pending")).toBe(true);
  });

  it("shows a locale as completed once the queue has run it", async () => {
    const id = await create("A document that will be translated");
    await enqueue(id, ["de"]);

    await ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

    const [entry] = await documentStatus(id);
    expect(entry.status).toBe("completed");
  });

  it("drops a finished locale from the collection panel", async () => {
    const id = await create("A document whose run is over");
    await enqueue(id, ["de"]);
    await ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

    const entries = await collectionStatus();
    expect(entries.some((e) => e.collection_id === id)).toBe(false);
  });

  it("stops the queued run of the document named, and says nothing was refused", async () => {
    const id = await create("A document whose run is cancelled by its own address");
    await enqueue(id, ["de"]);

    const cancelled = await callEndpoint(ctx.payload, "delete", "/translate/cancel", {
      body: { collection_slug: "docs", collection_id: [String(id)] },
    });

    expect(cancelled.status).toBe(204);
    expect(await documentStatus(id), "a cancelled locale has no word on the panel").toEqual([]);
  });

  it("stops every queued run of a collection at once", async () => {
    const first = await create("One of two to cancel together");
    const second = await create("The other of two to cancel together");
    await enqueue(first, ["de"]);
    await enqueue(second, ["fr"]);

    const response = await callEndpoint(ctx.payload, "delete", "/translate/cancel", {
      body: { collection_slug: "docs", collection_id: [String(first)], select_all: true },
    });

    expect(response.status).toBe(204);
    expect(await documentStatus(first)).toEqual([]);
    expect(await documentStatus(second)).toEqual([]);
  });

  it("answers 404 for a document with no run of its own", async () => {
    const response = await callEndpoint(
      ctx.payload,
      "post",
      "/translate/run/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: "999999" } }
    );

    expect(response.status).toBe(404);
  });
});
