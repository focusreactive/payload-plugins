import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import {
  createSyncRunner,
  createTranslationProvider,
  documentLevel,
  translatorPlugin,
} from "@focus-reactive/payload-plugin-translator";
import { buildConfig, getPayload } from "payload";
import type { CollectionConfig, Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { reverseComplete } from "../../lib/translator/fakeComplete";
import { callEndpoint } from "./callEndpoint";

// Boots its own Payload rather than reusing `bootTestPayload`, which has no no-versions and no
// autosave-drafts collection.
//
// ONE boot per file: `getPayload` caches its instance globally, so a second boot returns the first
// and every collection declared after it is missing.

const rev = (s: string) => [...s].reverse().join("");
const SOURCE = "Draft safety";
const TRANSLATED = rev(SOURCE);
const SUBTITLE = "Second field";
const PUBLISHED_NOTE = "PUBLISHED NOTE";
const PUBLISHED_PRICE = 200;
const DRAFT_PRICE = 999;
const FOREIGN_DRAFT = "FR SECRET DRAFT";

// Narrower than Payload's generated unions, which know nothing about a spec-local config —
// but narrow enough that a mistyped slug or locale is a type error rather than a runtime one.
type Slug = "docs" | "plain" | "auto";
type Locale = "en" | "de" | "fr";

const localizedTitle: CollectionConfig["fields"] = [
  { name: "title", type: "text", localized: true },
];

// `note` (non-localized) and `price` (localized, non-text) are never translated — they are what
// exposes a target read taken from the wrong layer.
const docsFields: CollectionConfig["fields"] = [
  { name: "title", type: "text", localized: true },
  { name: "subtitle", type: "text", localized: true },
  { name: "note", type: "text" },
  { name: "price", type: "number", localized: true },
];

let payload: Payload;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "draft-safe-"));
  const collections: CollectionConfig[] = [
    { slug: "users", auth: true, fields: [] },
    { slug: "docs", versions: { drafts: true }, fields: docsFields },
    { slug: "plain", fields: localizedTitle },
    { slug: "auto", versions: { drafts: { autosave: true } }, fields: localizedTitle },
  ];

  const config = await buildConfig({
    secret: "draft-safe-secret",
    db: sqliteAdapter({ client: { url: `file:${join(tmpDir, "test.db")}` } }),
    editor: lexicalEditor(),
    telemetry: false,
    localization: {
      defaultLocale: "en",
      // Load-bearing: with fallbacks on, an unpublished locale reads back as the source text and
      // every "this locale is not live" assertion below passes vacuously.
      fallback: false,
      locales: [
        { code: "en", label: "English" },
        { code: "de", label: "Deutsch" },
        { code: "fr", label: "Français" },
      ],
    },
    collections,
    plugins: [
      translatorPlugin({
        collections,
        translationProvider: createTranslationProvider({ complete: reverseComplete }),
        runner: createSyncRunner(),
        levels: [documentLevel()],
      }),
    ],
  });

  payload = await getPayload({ config });
});

afterAll(async () => {
  try {
    await payload?.db?.destroy?.();
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

const live = (collection: Slug, id: string, locale: Locale) =>
  payload.findByID({
    collection: collection as "docs",
    id,
    locale: locale as "en",
    draft: false,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

const asDraft = (collection: Slug, id: string, locale: Locale) =>
  payload.findByID({
    collection: collection as "docs",
    id,
    locale: locale as "en",
    draft: true,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

async function translate(
  collection: Slug,
  id: string,
  opts: { publish: boolean; strategy?: "overwrite" | "skip_existing" }
): Promise<void> {
  const res = await callEndpoint(payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: collection,
      collection_id: [id],
      strategy: opts.strategy ?? "overwrite",
      publish_on_translation: opts.publish,
    },
  });
  expect(res.status).toBe(200);
}

const seedForeignDraft = (collection: Slug, id: string) =>
  payload.update({
    collection: collection as "docs",
    id,
    locale: "fr",
    draft: true,
    data: { title: FOREIGN_DRAFT },
  });

const create = async (collection: Slug, status?: "published" | "draft") => {
  const base: Record<string, unknown> =
    collection === "docs"
      ? { title: SOURCE, subtitle: SUBTITLE, note: PUBLISHED_NOTE, price: PUBLISHED_PRICE }
      : { title: SOURCE };
  const doc = await payload.create({
    collection: collection as "docs",
    locale: "en",
    data: status ? { ...base, _status: status } : base,
  });
  return String(doc.id);
};

describe("draft-safe and per-locale-safe writes (#102)", () => {
  it("draft-mode translation leaves the document published and lands in the draft", async () => {
    const id = await create("docs", "published");

    await translate("docs", id, { publish: false });

    const en = await live("docs", id, "en");
    expect(en._status).toBe("published");
    expect(en.title).toBe(SOURCE);
    expect((await live("docs", id, "de")).title).toBeUndefined();
    expect((await asDraft("docs", id, "de")).title).toBe(TRANSLATED);
  });

  it("publish-mode translation publishes only the target locale", async () => {
    const id = await create("docs", "published");
    await seedForeignDraft("docs", id);

    await translate("docs", id, { publish: true });

    expect((await live("docs", id, "fr")).title).toBeUndefined();
    // Guards the explicit `_status`: without it the pending `fr` draft pulls the document back
    // to `draft`.
    expect((await live("docs", id, "en"))._status).toBe("published");
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
  });

  it("publish-mode translation of a never-published document publishes that locale alone", async () => {
    const id = await create("docs", "draft");
    await seedForeignDraft("docs", id);

    await translate("docs", id, { publish: true });

    expect((await live("docs", id, "en"))._status).toBe("published");
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
    expect((await live("docs", id, "fr")).title).toBeUndefined();
    expect((await live("docs", id, "en")).title).toBeUndefined();
  });

  it("publish mode on a collection with autosave drafts is scoped too", async () => {
    const id = await create("auto", "published");
    // Load-bearing: without this seed the assertions below also hold on the broken implementation.
    await seedForeignDraft("auto", id);

    await translate("auto", id, { publish: true });

    expect((await live("auto", id, "fr")).title).toBeUndefined();
    expect((await live("auto", id, "en"))._status).toBe("published");
    expect((await live("auto", id, "de")).title).toBe(TRANSLATED);
  });

  it("skip_existing preserves a human's correction to a draft translation", async () => {
    const id = await create("docs", "published");
    await translate("docs", id, { publish: false });

    // `subtitle: ""` is load-bearing: with nothing left to translate the run writes nothing and
    // the case passes vacuously.
    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      draft: true,
      data: { title: "HUMAN FIX", subtitle: "" },
    });

    await translate("docs", id, { publish: false, strategy: "skip_existing" });

    const de = await asDraft("docs", id, "de");
    expect(de.title).toBe("HUMAN FIX");
    expect(de.subtitle).toBe(rev(SUBTITLE));
  });

  it("publish mode does not take a colleague's pending edits live with the translation", async () => {
    const id = await create("docs", "published");
    // `de` needs a published `price` of its own, or the assertion below cannot tell a surviving
    // published value from a copied source value.
    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { price: PUBLISHED_PRICE },
    });
    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      draft: true,
      data: { note: "SECRET DRAFT NOTE", price: DRAFT_PRICE },
    });

    await translate("docs", id, { publish: true });

    expect((await live("docs", id, "en")).note).toBe(PUBLISHED_NOTE);
    expect((await live("docs", id, "de")).price).toBe(PUBLISHED_PRICE);
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
  });

  it("publish mode with skip_existing actually publishes", async () => {
    const id = await create("docs", "published");
    await translate("docs", id, { publish: false });

    await translate("docs", id, { publish: true, strategy: "skip_existing" });

    const de = await live("docs", id, "de");
    expect(de.title).toBe(TRANSLATED);
    expect((await live("docs", id, "en"))._status).toBe("published");
  });

  it("a collection without drafts is written exactly as before", async () => {
    const id = await create("plain");

    await translate("plain", id, { publish: false });

    // Control case: the no-drafts path is deliberately unchanged, so this must stay green against
    // the old implementation too. A red here means the fix leaked into a collection it must not touch.
    const de = await live("plain", id, "de");
    expect(de.title).toBe(TRANSLATED);
    expect(de).not.toHaveProperty("_status");
  });
});
