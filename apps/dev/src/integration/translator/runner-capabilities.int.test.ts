import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const paths = (): string[] => (ctx.payload.config.endpoints ?? []).map((e) => e.path);

describe("a runner that only accepts work", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("registers no route it cannot serve", () => {
    expect(paths()).not.toContain("/translate/cancel");
    expect(paths()).not.toContain("/translate/cancel-by-collection/:collection_slug");
    expect(paths()).not.toContain("/translate/run/:id");
  });

  it("still registers the routes that rest on the plugin's own record", () => {
    expect(paths()).toContain("/translate/enqueue");
    expect(paths()).toContain("/translate/document/:collection_slug/:collection_id");
    expect(paths()).toContain("/translate/collection/:collection_slug");
  });

  it("translates, and the document panel says the locale is done", async () => {
    const id = await create("Translated inline");

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "docs",
        collection_id: [id],
        publish_on_translation: false,
      },
    });

    const status = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );
    const rows = (status.data as { data: Array<{ status: string }> }).data;
    expect(
      rows.map((row) => row.status),
      "the record outlives the request, so status does not depend on the runner keeping anything"
    ).toEqual(["completed"]);
  });
});
