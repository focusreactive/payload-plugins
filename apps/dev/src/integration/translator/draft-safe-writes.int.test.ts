import type { CollectionConfig, Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const rev = (s: string) => [...s].reverse().join("");
const SOURCE = "Draft safety";
const TRANSLATED = rev(SOURCE);
const SUBTITLE = "Second field";
const PUBLISHED_NOTE = "PUBLISHED NOTE";
const PUBLISHED_PRICE = 200;
const DRAFT_PRICE = 999;
const FOREIGN_DRAFT = "FR SECRET DRAFT";
const CLEARED_TO_GIVE_THE_RERUN_WORK = "";

type Slug = "docs" | "plain" | "auto";
type Locale = "en" | "de" | "fr";

const localizedTitle: CollectionConfig["fields"] = [
  { name: "title", type: "text", localized: true },
];

const docsFields: CollectionConfig["fields"] = [
  { name: "title", type: "text", localized: true },
  { name: "subtitle", type: "text", localized: true },
  { name: "nonLocalizedNote", type: "text" },
  { name: "localizedPrice", type: "number", localized: true },
];

let payload: Payload;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const collections: CollectionConfig[] = [
    { slug: "users", auth: true, fields: [] },
    { slug: "docs", versions: { drafts: true }, fields: docsFields },
    { slug: "plain", fields: localizedTitle },
    { slug: "auto", versions: { drafts: { autosave: true } }, fields: localizedTitle },
  ];
  ({ payload, cleanup } = await bootTestPayload({ collections }));
});

afterAll(async () => {
  await cleanup();
});

const readAt = (draft: boolean) => (collection: Slug, id: string, locale: Locale) =>
  payload.findByID({
    collection: collection as "docs",
    id,
    locale: locale as "en",
    draft,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

const live = readAt(false);
const asDraft = readAt(true);

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

const giveDeItsOwnPublishedPrice = (id: string) =>
  payload.update({
    collection: "docs",
    id,
    locale: "de",
    data: { localizedPrice: PUBLISHED_PRICE },
  });

const create = async (collection: Slug, status?: "published" | "draft") => {
  const base: Record<string, unknown> =
    collection === "docs"
      ? {
          title: SOURCE,
          subtitle: SUBTITLE,
          nonLocalizedNote: PUBLISHED_NOTE,
          localizedPrice: PUBLISHED_PRICE,
        }
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
    expect((await live("docs", id, "en"))._status).toBe("published");
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
  });

  it("publish-mode translation of a never-published document publishes that locale alone", async () => {
    const id = await create("docs", "draft");
    await seedForeignDraft("docs", id);

    await translate("docs", id, { publish: true });

    const en = await live("docs", id, "en");
    expect(en._status).toBe("published");
    expect(en.title).toBeUndefined();
    expect((await live("docs", id, "de")).title).toBe(TRANSLATED);
    expect((await live("docs", id, "fr")).title).toBeUndefined();
  });

  it("publish mode on a collection with autosave drafts is scoped too", async () => {
    const id = await create("auto", "published");
    await seedForeignDraft("auto", id);

    await translate("auto", id, { publish: true });

    expect((await live("auto", id, "fr")).title).toBeUndefined();
    expect((await live("auto", id, "en"))._status).toBe("published");
    expect((await live("auto", id, "de")).title).toBe(TRANSLATED);
  });

  it("skip_existing preserves a human's correction to a draft translation", async () => {
    const id = await create("docs", "published");
    await translate("docs", id, { publish: false });

    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      draft: true,
      data: { title: "HUMAN FIX", subtitle: CLEARED_TO_GIVE_THE_RERUN_WORK },
    });

    await translate("docs", id, { publish: false, strategy: "skip_existing" });

    const de = await asDraft("docs", id, "de");
    expect(de.title).toBe("HUMAN FIX");
    expect(de.subtitle).toBe(rev(SUBTITLE));
  });

  it("publish mode takes the current draft live, including edits the translation did not touch", async () => {
    const id = await create("docs", "published");
    await giveDeItsOwnPublishedPrice(id);
    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      draft: true,
      data: { nonLocalizedNote: "SECRET DRAFT NOTE", localizedPrice: DRAFT_PRICE },
    });

    await translate("docs", id, { publish: true });

    expect((await live("docs", id, "en")).nonLocalizedNote).toBe("SECRET DRAFT NOTE");
    const de = await live("docs", id, "de");
    expect(de.localizedPrice).toBe(DRAFT_PRICE);
    expect(de.title).toBe(TRANSLATED);
  });

  it("a draft-mode translation leaves a colleague's pending draft edit alone", async () => {
    const id = await create("docs", "published");
    await payload.update({
      collection: "docs",
      id,
      locale: "de",
      draft: true,
      data: { nonLocalizedNote: "COLLEAGUE WIP" },
    });

    await translate("docs", id, { publish: false });

    const draft = await asDraft("docs", id, "de");
    expect(draft.nonLocalizedNote).toBe("COLLEAGUE WIP");
    expect(draft.title).toBe(TRANSLATED);
    expect((await live("docs", id, "en")).nonLocalizedNote).toBe(PUBLISHED_NOTE);
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

    const de = await live("plain", id, "de");
    expect(de.title).toBe(TRANSLATED);
    expect(de).not.toHaveProperty("_status");
  });
});
