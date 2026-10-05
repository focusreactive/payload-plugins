import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const PROV = "translator-provenance";
const HASH_CHARS = 16;

let ctx: TestPayload;

const receipt = async (documentId: string) => {
  const { docs } = await ctx.payload.find({
    collection: PROV,
    where: { documentId: { equals: documentId } },
    pagination: false,
  });
  return docs[0] as unknown as { id: string | number; sourceFingerprint: string } | undefined;
};

const translate = (id: string, strategy: "overwrite" | "skip_existing" = "overwrite") =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: "docs",
      collection_id: [id],
      strategy,
      publish_on_translation: true,
    },
  });

const create = async (data: Record<string, unknown>): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", ...data },
  });
  return String(made.id);
};

describe("the stored receipt", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("is a JSON object keyed by each translatable leaf's address", async () => {
    const id = await create({ title: "Receipt shape", note: "A note" });
    await translate(id);

    const row = await receipt(id);
    const parsed = JSON.parse(row?.sourceFingerprint ?? "") as Record<string, string>;
    expect(Object.keys(parsed).sort()).toEqual(["note", "title"]);
    const hashShape = new RegExp(`^[0-9a-f]{${HASH_CHARS}}$`, "u");
    expect(
      Object.values(parsed).every((hash) => hashShape.test(hash)),
      "computeFieldFingerprints owns the stored hash format"
    ).toBe(true);
  });

  it("round-trips a document with 500 translatable leaves through the column", async () => {
    const LEAVES = 500;
    const MIN_ROUND_TRIP_BYTES = LEAVES * HASH_CHARS;
    const id = await create({
      title: "Big",
      items: Array.from({ length: LEAVES }, (_, index) => ({ label: `Label ${index}` })),
    });
    await translate(id);

    const row = await receipt(id);
    const stored = row?.sourceFingerprint ?? "";
    expect(
      new TextEncoder().encode(stored).length,
      "a fixture that is not actually large would prove nothing about the column"
    ).toBeGreaterThan(MIN_ROUND_TRIP_BYTES);

    const parsed = JSON.parse(stored) as Record<string, string>;
    expect(Object.keys(parsed)).toHaveLength(LEAVES + 1); // the 500 labels plus `title`
  });

  it("reads a receipt written before per-field fingerprints, and upgrades it on the next run", async () => {
    const id = await create({ title: "Legacy", note: "Legacy note" });
    await translate(id);

    const row = await receipt(id);
    const legacyDocumentWideSha256 = "a".repeat(64);
    await ctx.payload.update({
      collection: PROV,
      id: row?.id as string | number,
      data: { sourceFingerprint: legacyDocumentWideSha256 },
    });
    expect((await receipt(id))?.sourceFingerprint).toBe(legacyDocumentWideSha256);

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "KORRIGIERT" },
    });
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Legacy, edited", note: "Legacy note" },
    });

    await translate(id, "skip_existing");

    const de = (await ctx.payload.findByID({ collection: "docs", id, locale: "de" })) as Record<
      string,
      unknown
    >;
    expect(de.title, "nothing proved this leaf moved, so today's behaviour holds").toBe(
      "KORRIGIERT"
    );

    expect(
      (await receipt(id))?.sourceFingerprint,
      "nothing was translated, so nothing new is claimed"
    ).toBe(legacyDocumentWideSha256);

    await translate(id, "overwrite");
    const upgraded = (await receipt(id))?.sourceFingerprint ?? "";
    expect(upgraded.startsWith("{")).toBe(true);
    expect(Object.keys(JSON.parse(upgraded) as Record<string, string>).sort()).toEqual([
      "note",
      "title",
    ]);
  });

  it("still hides the indicator once an editor dismisses the drift", async () => {
    const id = await create({ title: "Dismissed", note: "Dismissed note" });
    await translate(id);
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Dismissed, edited", note: "Dismissed note" },
    });

    const stale = async () => {
      const res = await callEndpoint(
        ctx.payload,
        "get",
        "/translate/stale/:collection_slug/:collection_id",
        { routeParams: { collection_slug: "docs", collection_id: id } }
      );
      const body = res.data as { data?: { locales: { is_stale: boolean }[] } } & {
        locales?: { is_stale: boolean }[];
      };
      return (body.data?.locales ?? body.locales ?? [])[0]?.is_stale;
    };

    expect(await stale(), "the source moved, so the indicator is on").toBe(true);

    await callEndpoint(ctx.payload, "post", "/translate/stale/dismiss", {
      body: { collection_slug: "docs", collection_id: id, target_lng: "de" },
    });

    expect(await stale(), "acknowledged, so it hides").toBe(false);
  });

  it("does not leave the indicator stuck on after a run that skipped a leaf", async () => {
    const id = await create({ title: "Partial run", note: "Partial note" });
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "VON HAND" },
    });

    await translate(id, "skip_existing");

    const stored = JSON.parse((await receipt(id))?.sourceFingerprint ?? "") as Record<
      string,
      string | null
    >;
    expect(Object.keys(stored).sort(), "every leaf of the source is accounted for").toEqual([
      "note",
      "title",
    ]);
    expect(stored.title, "seen and declined, so nothing is claimed about it").toBeNull();
    expect(stored.note).toEqual(expect.any(String));

    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/stale/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );
    const body = res.data as { data?: { locales: { is_stale: boolean }[] } };
    expect(
      body.data?.locales[0]?.is_stale,
      "the source has not moved since the run, so nothing is out of date"
    ).toBe(false);
  });

  it("still lights the indicator when a leaf genuinely appears after the translation", async () => {
    const id = await create({ title: "Grows later" });
    await translate(id, "overwrite");

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Grows later", note: "A note nobody translated yet" },
    });

    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/stale/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );
    const body = res.data as { data?: { locales: { is_stale: boolean }[] } };
    expect(body.data?.locales[0]?.is_stale, "a new untranslated leaf is real drift").toBe(true);
  });
});
