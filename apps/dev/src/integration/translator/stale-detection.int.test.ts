import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";
import { buildTestCollections, plainCollection } from "./testCollections";

// R6 — stale detection (#50). Manual translate (enqueue) records provenance; then a source change that
// is NOT re-translated must surface as stale for that target. Read via the real
// GET /translate/stale/:collection_slug/:collection_id endpoint (in-process).

type StaleLocale = { target_lng: string; is_stale: boolean };

const enqueue = (ctx: TestPayload, id: string, opts: { publish: boolean; slug?: string }) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: opts.slug ?? "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: opts.publish,
    },
  });

// `payload-types` is generated from the dev app's config, so this file's own slugs need a cast.
const staleDe = async (ctx: TestPayload, id: string, slug = "docs") => {
  const { data } = await callEndpoint(
    ctx.payload,
    "get",
    "/translate/stale/:collection_slug/:collection_id",
    { routeParams: { collection_slug: slug, collection_id: id } }
  );
  const body = data as { locales?: StaleLocale[]; data?: { locales?: StaleLocale[] } };
  const locales = body.locales ?? body.data?.locales ?? [];
  return locales.find((l) => l.target_lng === "de");
};

// The pipeline's walker reads only `type`, `text` and `children`, so this is a whole lexical value.
const lexical = (text: string) => ({
  root: {
    type: "root",
    children: [{ type: "paragraph", children: [{ type: "text", text }] }],
  },
});

describe("stale detection", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    // No auto-translate — so a source change won't auto re-translate.
    ctx = await bootTestPayload({ collections: [...buildTestCollections(), plainCollection] });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("is NOT stale immediately after translation", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Stale src" },
    });

    await enqueue(ctx, String(created.id), { publish: true });

    expect((await staleDe(ctx, String(created.id)))?.is_stale).toBe(false);
  });

  it("becomes stale after the source content changes without re-translation", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Stale src" },
    });
    await enqueue(ctx, String(created.id), { publish: true });

    await ctx.payload.update({
      collection: "docs",
      id: created.id,
      locale: "en",
      data: { _status: "published", title: "Stale src CHANGED" },
    });

    expect((await staleDe(ctx, String(created.id)))?.is_stale).toBe(true);
  });

  // Pins `fetchSourceDocument`'s `draft: true`: a publish scoped to the target locale leaves the
  // source locale unpublished, and a published-row read of it hashes an empty document.
  it("is NOT stale when the source itself was never published", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "draft", title: "Never published src" },
    });

    await enqueue(ctx, String(created.id), { publish: true });

    expect((await staleDe(ctx, String(created.id)))?.is_stale).toBe(false);
  });

  it("is NOT stale after a draft-mode translation", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Draft mode src" },
    });

    await enqueue(ctx, String(created.id), { publish: false });

    expect((await staleDe(ctx, String(created.id)))?.is_stale).toBe(false);
  });

  it("is NOT stale after translating a collection with no drafts", async () => {
    const created = await ctx.payload.create({
      collection: "plain" as "docs",
      locale: "en",
      data: { title: "Plain src" },
    });

    await enqueue(ctx, String(created.id), { publish: true, slug: "plain" });

    expect((await staleDe(ctx, String(created.id), "plain"))?.is_stale).toBe(false);
  });

  it("becomes stale on a no-drafts collection when the source changes", async () => {
    const created = await ctx.payload.create({
      collection: "plain" as "docs",
      locale: "en",
      data: { title: "Plain drift src" },
    });

    await enqueue(ctx, String(created.id), { publish: false, slug: "plain" });
    await ctx.payload.update({
      collection: "plain" as "docs",
      id: created.id,
      locale: "en",
      data: { title: "Plain drift src, edited" },
    });

    expect((await staleDe(ctx, String(created.id), "plain"))?.is_stale).toBe(true);
  });

  // The pipeline translates in place and shares object leaves — richText nodes — with the source by
  // reference, so the fingerprint has to be captured before it runs. Text fields are copied by
  // value, so richText is the only shape that catches the wrong order.
  it("is NOT stale when the source is richText", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: {
        _status: "published",
        title: "Rich src",
        body: lexical("A paragraph the pipeline will translate in place"),
      },
    });

    await enqueue(ctx, String(created.id), { publish: false });

    expect((await staleDe(ctx, String(created.id)))?.is_stale).toBe(false);
  });
});
