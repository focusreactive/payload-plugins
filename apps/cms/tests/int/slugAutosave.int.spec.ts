import type { Payload } from "payload";
import { getPayload, ValidationError } from "payload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ALL_LOCALES, I18N_CONFIG } from "@/lib/config/i18n";
import config from "@/payload.config";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T>(load: T) => load,
}));

const SLUGGED_COLLECTIONS = ["page", "posts"] as const;

type SluggedCollection = (typeof SLUGGED_COLLECTIONS)[number];

const defaultLocale = ALL_LOCALES.find((code) => code === I18N_CONFIG.defaultLocale)!;
const translatedLocale = ALL_LOCALES.find((code) => code !== defaultLocale)!;

let payload: Payload;
const createdDocs: { collection: SluggedCollection; id: number }[] = [];

async function createDraft(collection: SluggedCollection) {
  const doc = await payload.create({ collection, data: {}, depth: 0, draft: true });
  createdDocs.push({ collection, id: doc.id });
  return doc;
}

function findDraft(collection: SluggedCollection, id: number) {
  return payload.findByID({ collection, depth: 0, draft: true, id });
}

function autosave(
  collection: SluggedCollection,
  id: number,
  data: Record<string, unknown>,
  locale = defaultLocale
) {
  return payload.update({ autosave: true, collection, data, depth: 0, draft: true, id, locale });
}

async function autosaveTranslation(
  collection: SluggedCollection,
  id: number,
  translation: Record<string, unknown>
) {
  const current = await payload.findByID({
    collection,
    depth: 0,
    draft: true,
    fallbackLocale: false,
    id,
    locale: translatedLocale,
  });
  return autosave(
    collection,
    id,
    { ...current, ...translation, _status: "draft" },
    translatedLocale
  );
}

function exceedPayloadVersionThreshold(collection: SluggedCollection, id: number, data: object) {
  return payload.update({ collection, data: { ...data }, depth: 0, draft: true, id });
}

function publishPage(id: number, data: object, locale = defaultLocale) {
  return payload.update({
    collection: "page",
    context: { skipEmbedding: true },
    data: {
      ...data,
      _status: "published",
      blocks: [{ blockType: "testimonialsList" }],
      hero: [{ blockType: "hero", variant: "showcase" }],
    },
    depth: 0,
    id,
    locale,
  });
}

async function autosaveTitles(collection: SluggedCollection, id: number, titles: string[]) {
  let current = await findDraft(collection, id);

  for (const title of titles) {
    current = await autosave(collection, id, { ...current, _status: "draft", title });
  }

  return current;
}

describe("slug while autosaving drafts", { timeout: 30_000 }, () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config });
  });

  afterAll(async () => {
    for (const { collection, id } of createdDocs) {
      await payload.delete({ collection, id });
    }
  });

  it.each(SLUGGED_COLLECTIONS)("follows the latest %s title", async (collection) => {
    const draft = await createDraft(collection);
    const suffix = draft.id;

    const typed = await autosaveTitles(collection, draft.id, [
      `Slug ${suffix}`,
      `Slug ${suffix} about`,
    ]);
    await exceedPayloadVersionThreshold(collection, draft.id, typed);
    const doc = await autosaveTitles(collection, draft.id, [
      `Slug ${suffix} about us`,
      `Slug ${suffix} about us team`,
    ]);

    expect(doc.slug).toBe(`slug-${suffix}-about-us-team`);
  });

  it("keeps a slug the editor typed", async () => {
    const draft = await createDraft("page");
    const suffix = draft.id;

    const titled = await autosaveTitles("page", draft.id, [`Typed ${suffix}`, `Typed ${suffix} a`]);
    const customSlug = `custom-${suffix}`;
    await autosave("page", draft.id, { ...titled, slug: customSlug });
    const retitled = await autosaveTitles("page", draft.id, [`Typed ${suffix} b`]);

    expect(retitled.slug).toBe(customSlug);
  });

  it("stops following the title once the page is published", async () => {
    const draft = await createDraft("page");
    const suffix = draft.id;

    const titled = await autosaveTitles("page", draft.id, [
      `Live ${suffix}`,
      `Live ${suffix} a`,
      `Live ${suffix} b`,
    ]);
    const published = await publishPage(draft.id, titled);
    const retitled = await autosaveTitles("page", draft.id, [`Live ${suffix} renamed`]);

    expect(published.slug).toBe(`live-${suffix}-b`);
    expect(retitled.slug).toBe(`live-${suffix}-b`);
  });

  it.each([
    ["without", {}],
    ["with", { title: "Traducido" }],
  ])(
    "keeps the slug when a translation %s its own title is autosaved",
    async (_titleState, translation) => {
      const draft = await createDraft("page");
      const suffix = draft.id;

      await autosaveTitles("page", draft.id, [`Locale ${suffix}`]);
      const translated = await autosaveTranslation("page", draft.id, translation);
      const retitled = await autosaveTitles("page", draft.id, [`Locale ${suffix} renamed`]);

      expect(translated.slug).toBe(`locale-${suffix}`);
      expect(translated.generateSlug).toBe(true);
      expect(retitled.slug).toBe(`locale-${suffix}-renamed`);
    }
  );

  it("stops following the title once the page is published in another locale", async () => {
    const draft = await createDraft("page");
    const suffix = draft.id;

    await autosaveTitles("page", draft.id, [`Abroad ${suffix}`]);
    await publishPage(draft.id, { title: `Extranjero ${suffix}` }, translatedLocale);
    const retitled = await autosaveTitles("page", draft.id, [`Abroad ${suffix} renamed`]);

    expect(retitled.slug).toBe(`abroad-${suffix}`);
    expect(retitled.generateSlug).toBe(false);
  });

  it("generates the slug from the translated title when only a translation was autosaved", async () => {
    const draft = await createDraft("page");
    const suffix = draft.id;

    const translated = await autosaveTranslation("page", draft.id, {
      title: `Traducido ${suffix}`,
    });

    expect(translated.slug).toBe(`traducido-${suffix}`);
  });

  it("refuses to publish a page without a slug", async () => {
    const draft = await createDraft("page");
    const suffix = draft.id;

    await expect(
      publishPage(draft.id, { generateSlug: false, slug: null, title: `Unslugged ${suffix}` })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
