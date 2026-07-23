import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// R6 — stale detection (#50). Manual translate (enqueue) records provenance; then a source change that
// is NOT re-translated must surface as stale for that target. Read via the real
// GET /translate/stale/:collection_slug/:collection_id endpoint (in-process).

type StaleLocale = { target_lng: string; is_stale: boolean };

const readStale = async (ctx: TestPayload, id: string): Promise<StaleLocale[]> => {
  const { data } = await callEndpoint(
    ctx.payload,
    "get",
    "/translate/stale/:collection_slug/:collection_id",
    { routeParams: { collection_slug: "docs", collection_id: id } }
  );
  const body = data as { locales?: StaleLocale[]; data?: { locales?: StaleLocale[] } };
  return body.locales ?? body.data?.locales ?? [];
};

describe("stale detection", () => {
  let ctx: TestPayload;
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload(); // no auto-translate — so a source change won't auto re-translate
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Stale src" },
    });
    id = String(created.id);
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "de",
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: true,
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("is NOT stale immediately after translation", async () => {
    const de = (await readStale(ctx, id)).find((l) => l.target_lng === "de");
    expect(de).toBeDefined();
    expect(de?.is_stale).toBe(false);
  });

  it("becomes stale after the source content changes without re-translation", async () => {
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Stale src CHANGED" },
    });
    const de = (await readStale(ctx, id)).find((l) => l.target_lng === "de");
    expect(de?.is_stale).toBe(true);
  });
});
