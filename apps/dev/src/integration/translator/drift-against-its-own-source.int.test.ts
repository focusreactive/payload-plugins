import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Tracked = { kind: "tracked"; verdicts: Record<string, string>; sourceLocale: string };
type State = { locales: { locale: string; content: Tracked }[] };

const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "summary", type: "text", localized: true },
  ],
};

const germanOf = async (ctx: TestPayload, id: string) => {
  const res = await callEndpoint(
    ctx.payload,
    "get",
    "/translate/document-state/:collection_slug/:collection_id",
    { routeParams: { collection_slug: "docs", collection_id: id } }
  );
  const { locales } = (res.data as { data: State }).data;
  return locales.find((one) => one.locale === "de")?.content as Tracked;
};

describe("the document state of a locale translated from another locale than the panel's source", () => {
  let ctx: TestPayload;
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({ collections: [docs] });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { title: "An English title", summary: "An English summary" },
    });
    id = String(made.id);
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "fr",
      data: { title: "Un titre", summary: "Un résumé" },
    });
    const queued = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: { source_lng: "fr", target_lng: "de", collection_slug: "docs", collection_id: [id] },
    });
    expect(queued.status).toBe(200);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("reads a fresh translation as current, and names the locale it came from", async () => {
    const german = await germanOf(ctx, id);

    expect(german.sourceLocale).toBe("fr");
    expect(german.verdicts).toStrictEqual({ title: "current", summary: "current" });
  });

  it("stays current when only the panel's source changes", async () => {
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { title: "A new title" },
    });

    expect((await germanOf(ctx, id)).verdicts).toStrictEqual({
      title: "current",
      summary: "current",
    });
  });

  it("drifts the one leaf its own source changed", async () => {
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "fr",
      data: { title: "Un nouveau titre" },
    });

    expect((await germanOf(ctx, id)).verdicts).toStrictEqual({
      title: "drifted",
      summary: "current",
    });
  });
});
