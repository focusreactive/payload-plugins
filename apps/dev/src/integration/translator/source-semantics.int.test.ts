import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Boots with `fallback: true`, unlike every other spec here. `fallback` is localization-level and
// one boot serves a whole file, so the "a fallback is not a source" case cannot live in an
// existing spec.

// The fake provider translates by reversing the string.
const machineTranslated = (s: string) => [...s].reverse().join("");
const EN = "Hello from EN";

type Locale = "en" | "de" | "fr";

let ctx: TestPayload;

beforeAll(async () => {
  const collections: CollectionConfig[] = [
    { slug: "users", auth: true, fields: [] },
    {
      slug: "docs",
      versions: { drafts: true },
      fields: [{ name: "title", type: "text", localized: true }],
    },
  ];
  ctx = await bootTestPayload({ collections, fallback: true });
});

afterAll(async () => {
  await ctx.cleanup();
});

// Translations land in the draft layer, and this file boots with fallbacks on — drop either arg
// and these reads return the pre-translation value instead of nothing.
// `payload-types` is generated from the dev app's config, so this file's own slugs and locales
// need a cast.
const read = (id: string, locale: Locale) =>
  ctx.payload.findByID({
    collection: "docs",
    id,
    locale: locale as "en",
    draft: true,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

const readWithFallback = (id: string, locale: Locale) =>
  ctx.payload.findByID({
    collection: "docs",
    id,
    locale: locale as "en",
    draft: true,
  }) as Promise<Record<string, unknown>>;

const write = (id: string, locale: Locale, title: string, draft = false) =>
  ctx.payload.update({
    collection: "docs",
    id,
    locale: locale as "en",
    ...(draft ? { draft: true } : {}),
    data: { title },
  });

const translate = async (id: string, sourceLng: Locale, targetLng: Locale) => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: sourceLng,
      target_lng: targetLng,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: false,
    },
  });
  expect(res.status).toBe(200);
};

const createPublished = async (title: string) => {
  const doc = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { title, _status: "published" },
  });
  return String(doc.id);
};

describe("which locale a translation is taken from", () => {
  it("a fallback is not a source — the empty locale gives nothing, the real one gives a translation", async () => {
    const id = await createPublished(EN);
    // Pins the boot's `fallback: true`: flip it and this fails loudly, instead of every case below
    // passing for the wrong reason.
    expect((await readWithFallback(id, "fr")).title).toBe(EN);
    expect((await read(id, "fr")).title).toBeUndefined();

    await translate(id, "fr", "de");
    expect((await read(id, "de")).title).toBeUndefined();

    await translate(id, "en", "de");
    expect((await read(id, "de")).title).toBe(machineTranslated(EN));
  });

  it("translates the source locale's own text when it has some", async () => {
    const id = await createPublished(EN);
    await write(id, "fr", "Bonjour");

    await translate(id, "fr", "de");

    expect((await read(id, "de")).title).toBe(machineTranslated("Bonjour"));
  });
});

describe("which version of the source is taken", () => {
  it("uses the newer draft when the source has one, not the published text", async () => {
    const id = await createPublished(EN);
    await write(id, "en", "EN draft edit", true);

    await translate(id, "en", "de");

    expect((await read(id, "de")).title).toBe(machineTranslated("EN draft edit"));
  });

  it("uses the published text when the source has no newer draft", async () => {
    const id = await createPublished(EN);

    await translate(id, "en", "de");

    expect((await read(id, "de")).title).toBe(machineTranslated(EN));
  });

  it("translates a source that was never published", async () => {
    const doc = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { title: "Never published", _status: "draft" },
    });
    const id = String(doc.id);

    await translate(id, "en", "de");

    expect((await read(id, "de")).title).toBe(machineTranslated("Never published"));
  });
});
