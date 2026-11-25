import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type LocaleState = { locale: string; run: { status: string } | null };

const docs: CollectionConfig = {
  slug: "docs",
  fields: [{ name: "title", type: "text", localized: true }],
};

const WINDOW_MS = 50;

describe("a failure older than the failure window shows nowhere", () => {
  let ctx: TestPayload;
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: [docs],
      failedWindowMs: WINDOW_MS,
      onTranslate: (targetLng) => {
        if (targetLng === "de") throw new Error("provider down");
      },
    });
    id = String(
      (await ctx.payload.create({ collection: "docs", locale: "en", data: { title: "Old" } })).id
    );
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: { source_lng: "en", target_lng: "de", collection_slug: "docs", collection_id: [id] },
    });
    await new Promise((resolve) => setTimeout(resolve, WINDOW_MS * 3));
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("shows no run in the document", async () => {
    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document-state/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );
    const locales = (res.data as { data: { locales: LocaleState[] } }).data.locales;

    expect(locales.find((one) => one.locale === "de")?.run).toBeNull();
  });

  it("shows no run in the list", async () => {
    const res = await callEndpoint(ctx.payload, "get", "/translate/list-state/:collection_slug", {
      routeParams: { collection_slug: "docs" },
      query: `ids=${id}`,
    });
    const locales = (res.data as { data: { docs: { locales: LocaleState[] }[] } }).data.docs[0]!
      .locales;

    expect(locales.find((one) => one.locale === "de")?.run).toBeNull();
  });
});
