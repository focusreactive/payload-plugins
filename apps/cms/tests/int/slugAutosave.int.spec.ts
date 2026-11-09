import type { Payload } from "payload";
import { getPayload } from "payload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import config from "@/payload.config";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T>(load: T) => load,
}));

const SLUGGED_COLLECTIONS = ["page", "posts"] as const;

type SluggedCollection = (typeof SLUGGED_COLLECTIONS)[number];

let payload: Payload;
const createdDocs: { collection: SluggedCollection; id: number }[] = [];

async function createDraft(collection: SluggedCollection) {
  const doc = await payload.create({ collection, data: {}, depth: 0, draft: true });
  createdDocs.push({ collection, id: doc.id });
  return doc;
}

function findDraft<TCollection extends SluggedCollection>(collection: TCollection, id: number) {
  return payload.findByID({ collection, depth: 0, draft: true, id });
}

function autosave(collection: SluggedCollection, id: number, data: Record<string, unknown>) {
  return payload.update({ autosave: true, collection, data, depth: 0, draft: true, id });
}

async function autosaveTitles<TCollection extends SluggedCollection>(
  collection: TCollection,
  id: number,
  titles: string[]
) {
  for (const title of titles) {
    const current = await findDraft(collection, id);
    await autosave(collection, id, { ...current, _status: "draft", title });
  }

  return findDraft(collection, id);
}

describe("slug while autosaving drafts", () => {
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
    await payload.update({ collection, data: { ...typed }, depth: 0, draft: true, id: draft.id });
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
    const published = await payload.update({
      collection: "page",
      data: {
        ...titled,
        _status: "published",
        blocks: titled.blocks.filter(({ blockType }) => blockType !== "content"),
      },
      depth: 0,
      id: draft.id,
    });
    const retitled = await autosaveTitles("page", draft.id, [`Live ${suffix} renamed`]);

    expect(published.slug).toBe(`live-${suffix}-b`);
    expect(retitled.slug).toBe(`live-${suffix}-b`);
  });
});
