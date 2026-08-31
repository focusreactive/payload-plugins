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

// #102 — the translator used to write `_status` into an ordinary `payload.update`, with no
// `draft: true`. Because Payload keeps `_status` as ONE non-localized column per document, that made
// translating a single locale change the publish state of the WHOLE document: a draft-mode run
// unpublished a live page site-wide, and a publish-mode run pushed every other locale's unreviewed
// draft into production.
//
// Every assertion here is about the document's real publish state, so it needs a real database —
// `handler.test.ts` asserts the same fix against a stub, and a stub models neither the versions table
// nor the shared `_status` column. That gap is precisely how the defect survived review.
//
// This spec boots its OWN Payload rather than reusing `bootTestPayload`: it needs collection shapes
// the shared fixture does not have (one with no `versions` at all, one with autosave drafts), and
// adding them there would reshape every other spec's schema. Two constraints follow:
//   - ONE boot per file. `getPayload` caches its instance globally, so a second boot returns the
//     first one and every later collection is missing.
//   - Fallbacks OFF, at both the config and every read. With fallbacks on, reading an unpublished
//     locale returns the SOURCE text, and every "this locale is not live" assertion below would pass
//     without proving anything.

const rev = (s: string) => [...s].reverse().join("");
const SOURCE = "Draft safety";
const TRANSLATED = rev(SOURCE);
const SUBTITLE = "Second field";
const PUBLISHED_NOTE = "PUBLISHED NOTE";
const PUBLISHED_PRICE = 200;

const localizedTitle: CollectionConfig["fields"] = [
  { name: "title", type: "text", localized: true },
];

// `docs` carries two fields the translator will NOT touch: a non-localized one and a localized
// non-text one. The reconciler copies untranslated leaves from the target read straight into the
// write, so these are what expose a read that comes from the wrong layer.
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
      // Load-bearing: see the header note.
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
  await payload?.db?.destroy?.();
  rmSync(tmpDir, { recursive: true, force: true });
});

/** Read what the public sees: the main table, never a draft, never a fallback. */
const live = (collection: string, id: string, locale: string) =>
  payload.findByID({
    collection: collection as "docs",
    id,
    locale: locale as "en",
    draft: false,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

/** Read what an editor sees: the latest draft. */
const asDraft = (collection: string, id: string, locale: string) =>
  payload.findByID({
    collection: collection as "docs",
    id,
    locale: locale as "en",
    draft: true,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

async function translate(
  collection: string,
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

const create = async (collection: string, status?: "published" | "draft") => {
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
  it("draft-mode translation leaves a published document published", async () => {
    const id = await create("docs", "published");

    await translate("docs", id, { publish: false });

    // AC1 — the defect: this used to read "draft", taking the page off the live site.
    expect((await live("docs", id, "en"))._status).toBe("published");
    // The source locale is untouched.
    expect((await live("docs", id, "en")).title).toBe(SOURCE);
  });

  it("draft-mode translation lands in the draft, not on the live locale", async () => {
    const id = await create("docs", "published");

    await translate("docs", id, { publish: false });

    // AC2 — the translation is reviewable, and invisible to the public until someone publishes it.
    expect((await live("docs", id, "de")).title).toBeUndefined();
    expect((await asDraft("docs", id, "de")).title).toBe(TRANSLATED);
  });

  it("publish-mode translation publishes only the target locale", async () => {
    const id = await create("docs", "published");
    // An unrelated locale is mid-edit and must not be dragged live.
    await payload.update({
      collection: "docs",
      id,
      locale: "fr",
      draft: true,
      data: { title: "FR SECRET DRAFT" },
    });

    await translate("docs", id, { publish: true });

    // AC3 — the defect: this used to read "FR SECRET DRAFT", shipping unreviewed work.
    expect((await live("docs", id, "fr")).title).toBeUndefined();
    // AC4 — and the document stays published. Without the explicit `_status`, the pending `fr`
    // draft above drags the whole document back to "draft".
    expect((await live("docs", id, "en"))._status).toBe("published");
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
  });

  it("publish-mode translation of a never-published document publishes that locale alone", async () => {
    const id = await create("docs", "draft");
    await payload.update({
      collection: "docs",
      id,
      locale: "fr",
      draft: true,
      data: { title: "FR SECRET DRAFT" },
    });

    await translate("docs", id, { publish: true });

    // AC8 — an explicit publish request publishes, and publishes nothing but the locale asked for.
    // The source locale was never published and stays that way.
    expect((await live("docs", id, "en"))._status).toBe("published");
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
    expect((await live("docs", id, "fr")).title).toBeUndefined();
    expect((await live("docs", id, "en")).title).toBeUndefined();
  });

  it("publish mode on a collection with autosave drafts is scoped too", async () => {
    const id = await create("auto", "published");
    // The foreign draft is what makes this case bite: without it the assertions below hold on the
    // BROKEN implementation as well, and the test proves nothing. A mutation run caught exactly
    // that — this case passed against the old code until the seed was added.
    await payload.update({
      collection: "auto",
      id,
      locale: "fr",
      draft: true,
      data: { title: "FR SECRET DRAFT" },
    });

    await translate("auto", id, { publish: true });

    // AC9 — autosave collections take the same scoped publish path, not a special case.
    expect((await live("auto", id, "fr")).title).toBeUndefined();
    expect((await live("auto", id, "en"))._status).toBe("published");
    expect((await live("auto", id, "de")).title).toBe(TRANSLATED);
  });

  it("skip_existing preserves a human's correction to a draft translation", async () => {
    const id = await create("docs", "published");
    await translate("docs", id, { publish: false });

    // A reviewer fixes one field of the machine translation, in the draft where it lives, and
    // clears another so the next run still has real work to do. Without that second field the run
    // would produce no write at all, and the case would stay green for the wrong reason.
    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      draft: true,
      data: { title: "HUMAN FIX", subtitle: "" },
    });

    await translate("docs", id, { publish: false, strategy: "skip_existing" });

    const de = await asDraft("docs", id, "de");
    // AC10 — routing the WRITE into a version row without moving the READ there too made every
    // field look empty to skip_existing, so it skipped nothing and overwrote the correction.
    expect(de.title).toBe("HUMAN FIX");
    // ...and the run genuinely wrote: the cleared field came back translated.
    expect(de.subtitle).toBe(rev(SUBTITLE));
  });

  it("publish mode does not take a colleague's pending edits live with the translation", async () => {
    const id = await create("docs", "published");
    // Give the TARGET locale a published price of its own, so the assertion below is about a
    // published `de` value surviving rather than about the source locale's value being copied into
    // an empty slot — those are different facts and only the first is what this case claims.
    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { price: PUBLISHED_PRICE },
    });
    // Edits staged in the draft, to fields the translator never touches: one non-localized, one a
    // localized number. Neither is translatable, so the reconciler copies whatever the target read
    // shows straight into the write.
    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      draft: true,
      data: { note: "SECRET DRAFT NOTE", price: 999 },
    });

    await translate("docs", id, { publish: true });

    // AC11 — reading the draft while writing live promoted these across the boundary: exactly the
    // "publish mode ships unreviewed work" failure this whole change exists to close.
    expect((await live("docs", id, "en")).note).toBe(PUBLISHED_NOTE);
    expect((await live("docs", id, "de")).price).toBe(PUBLISHED_PRICE);
    // The translation itself still went live.
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
  });

  it("publish mode with skip_existing actually publishes", async () => {
    const id = await create("docs", "published");
    await translate("docs", id, { publish: false });

    await translate("docs", id, { publish: true, strategy: "skip_existing" });

    // AC12 — when the target read came from the draft, every field looked filled, the pipeline
    // produced no work, and the handler returned success before ever reaching the write. The
    // endpoint answered 200 and nothing was published.
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
    expect((await live("docs", id, "en"))._status).toBe("published");
  });

  it("a collection without drafts is written exactly as before", async () => {
    const id = await create("plain");

    await translate("plain", id, { publish: false });

    // AC5 — no versions means no draft routing and no status: the translation is simply live.
    // This case is a CONTROL: it must pass against the old implementation too, because that path is
    // deliberately unchanged. A red here would mean the fix leaked into collections it must not touch.
    const de = await live("plain", id, "de");
    expect(de.title).toBe(TRANSLATED);
    expect(de).not.toHaveProperty("_status");
  });
});
