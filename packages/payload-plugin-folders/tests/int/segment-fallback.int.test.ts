import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import {
  createFolder,
  createPage,
  createTestRequest,
  uniqueName,
} from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  vi.restoreAllMocks();
  await harness?.destroy();
});

type LocalizedPage = {
  blocks?: Array<{ blockType: string; heading?: Record<string, string>; id: string }>;
  fullPath: Record<string, string>;
  id: number;
  pathSegment: Record<string, string>;
  slug: Record<string, string>;
  title: Record<string, string>;
};

const readAllLocales = (payload: Payload, id: number, draft = false) =>
  payload.findByID({
    collection: "pages",
    depth: 0,
    draft,
    id,
    locale: "all",
    overrideAccess: true,
  }) as unknown as Promise<LocalizedPage>;

const setEnglishSlug = (payload: Payload, id: number, slug: string, draft = false) =>
  payload.update({
    collection: "pages",
    data: { slug },
    depth: 0,
    draft,
    id,
    overrideAccess: true,
  });

const setGermanSlug = (payload: Payload, id: number, slug: string) =>
  payload.update({
    collection: "pages",
    data: { slug, title: `Titel ${slug}` },
    depth: 0,
    id,
    locale: "de",
    overrideAccess: true,
  });

describe("segment fallback refresh", () => {
  it("a de page without a de slug follows an en slug change", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Fall", slug: uniqueName("fall") });
    const page = await createPage(payload, { folder: folder.id, slug: "first" });

    // The create already gives de its own pathSegment row, so a query in de finds the page.
    expect((await readAllLocales(payload, page.id)).pathSegment).toEqual({
      de: "first",
      en: "first",
    });

    await setEnglishSlug(payload, page.id, "second");

    const stored = await readAllLocales(payload, page.id);
    expect(stored.pathSegment).toEqual({ de: "second", en: "second" });
    expect(stored.slug.en).toBe("second");
    expect(stored.slug.de ?? null).toBeNull();
    expect(stored.fullPath).toEqual({
      de: `${folder.fullPath}/second`,
      en: `${folder.fullPath}/second`,
    });

    const foundInGerman = await payload.find({
      collection: "pages",
      locale: "de",
      overrideAccess: true,
      where: { pathSegment: { equals: "second" } },
    });
    expect(foundInGerman.docs.map((doc) => doc.id)).toEqual([page.id]);
    const staleInGerman = await payload.find({
      collection: "pages",
      locale: "de",
      overrideAccess: true,
      where: { pathSegment: { equals: "first" } },
    });
    expect(staleInGerman.docs.map((doc) => doc.id)).not.toContain(page.id);
  });

  it("a de page with its own slug keeps it", async () => {
    const { payload } = harness;
    const page = await createPage(payload, { slug: "first-own" });
    await setGermanSlug(payload, page.id, "erste");

    await setEnglishSlug(payload, page.id, "second-own");

    const stored = await readAllLocales(payload, page.id);
    expect(stored.pathSegment).toEqual({ de: "erste", en: "second-own" });
    expect(stored.slug).toEqual({ de: "erste", en: "second-own" });
  });

  it("other localized fields of de are unchanged after the refresh", async () => {
    const { payload } = harness;
    const page = await payload.create({
      collection: "pages",
      data: {
        blocks: [{ blockType: "hero", heading: "Hero" }],
        slug: "fields-first",
        title: "Title",
      },
      depth: 0,
      overrideAccess: true,
    });
    const blockId = (page.blocks as Array<{ id: string }>)[0].id;
    await payload.update({
      collection: "pages",
      data: { blocks: [{ blockType: "hero", heading: "Held", id: blockId }], title: "Titel" },
      depth: 0,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });
    const before = await readAllLocales(payload, page.id);

    await setEnglishSlug(payload, page.id, "fields-second");

    const after = await readAllLocales(payload, page.id);
    expect(after.pathSegment.de).toBe("fields-second");
    expect(after.title).toEqual({ de: "Titel", en: "Title" });
    expect(after.title).toEqual(before.title);
    expect(after.blocks).toEqual(before.blocks);
    expect(after.blocks?.[0].heading).toEqual({ de: "Held", en: "Hero" });
  });

  it("a draft en change refreshes de only in the draft", async () => {
    const { payload } = harness;
    const page = await payload.create({
      collection: "pages",
      data: { _status: "published", slug: "live-one", title: "Live" },
      depth: 0,
      overrideAccess: true,
    });
    expect((await readAllLocales(payload, page.id)).pathSegment).toEqual({
      de: "live-one",
      en: "live-one",
    });

    await setEnglishSlug(payload, page.id, "draft-one", true);

    expect((await readAllLocales(payload, page.id, true)).pathSegment).toEqual({
      de: "draft-one",
      en: "draft-one",
    });
    expect((await readAllLocales(payload, page.id)).pathSegment).toEqual({
      de: "live-one",
      en: "live-one",
    });

    // Publishing en needs no de title: the segment refresh is part of the same save. Payload
    // publishes a locale at a time, so the published row holds en only until de is published.
    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "draft-one" },
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    const published = await readAllLocales(payload, page.id);
    expect(published.pathSegment.en).toBe("draft-one");
    expect(published.title.en).toBe("Live");
  });

  it("the refresh writes one update per fallback locale", async () => {
    const { payload } = harness;
    const page = await createPage(payload, { slug: "count-first" });
    const update = vi.spyOn(payload, "update");

    // The fallback locale, de, is written by the caller's own save: no second Local API update, so
    // no second validation of de's required fields and no second version.
    await setEnglishSlug(payload, page.id, "count-second");
    expect(update.mock.calls).toHaveLength(1);
    expect((await readAllLocales(payload, page.id)).pathSegment).toEqual({
      de: "count-second",
      en: "count-second",
    });

    update.mockClear();
    await setGermanSlug(payload, page.id, "zaehlen");
    await setEnglishSlug(payload, page.id, "count-third");
    update.mockRestore();
    // Every locale has its own slug, so de keeps it.
    expect((await readAllLocales(payload, page.id)).pathSegment).toEqual({
      de: "zaehlen",
      en: "count-third",
    });
  });

  it("a page with a required title in en only still saves a new en slug", async () => {
    const { payload } = harness;
    const page = await payload.create({
      collection: "pages",
      data: { _status: "published", slug: "required-first", title: "Only English" },
      depth: 0,
      overrideAccess: true,
    });

    // A de locale row exists from the first save, with a null title. A save of de's fields would
    // refuse it ("Title (de)"); the segment refresh must not.
    await expect(
      payload.update({
        collection: "pages",
        data: { _status: "published", slug: "required-second" },
        depth: 0,
        id: page.id,
        overrideAccess: true,
      })
    ).resolves.toBeDefined();
    await expect(
      payload.update({
        collection: "pages",
        data: { slug: "required-third" },
        depth: 0,
        draft: true,
        id: page.id,
        overrideAccess: true,
      })
    ).resolves.toBeDefined();
    expect((await readAllLocales(payload, page.id)).pathSegment.en).toBe("required-second");
    expect((await readAllLocales(payload, page.id, true)).pathSegment).toEqual({
      de: "required-third",
      en: "required-third",
    });
  });

  it("a cleared en slug clears the segment of the locales that fall back to it", async () => {
    const { payload } = harness;
    const page = await createPage(payload, { slug: "clear-first" });

    await setEnglishSlug(payload, page.id, "");

    const stored = await readAllLocales(payload, page.id);
    expect(stored.pathSegment.en ?? null).toBeNull();
    expect(stored.pathSegment.de ?? null).toBeNull();
  });

  it("a refresh leaves the caller's req.context and req.locale alone and later writes validated", async () => {
    const { payload } = harness;
    const req = await createTestRequest(payload);
    const page = await payload.create({
      collection: "pages",
      data: { slug: "request-first", title: "Request" },
      depth: 0,
      overrideAccess: true,
      req,
    });
    const contextBefore = { ...req.context };

    await payload.update({
      collection: "pages",
      data: { slug: "request-second" },
      depth: 0,
      id: page.id,
      overrideAccess: true,
      req,
    });

    expect((await readAllLocales(payload, page.id)).pathSegment.de).toBe("request-second");
    expect(req.locale).toBe("en");
    expect(req.context).toEqual(contextBefore);
    expect(req.context.foldersInternal).toBeUndefined();

    // The page create hook refuses a missing folder, unless the request were marked internal.
    let failure: unknown;
    try {
      await payload.create({
        collection: "pages",
        data: { folder: 999_999, slug: "request-third", title: "Third" },
        depth: 0,
        overrideAccess: true,
        req,
      });
    } catch (error) {
      failure = error;
    }
    expect(
      (failure as { data?: { errors?: Array<{ message: string }> } })?.data?.errors?.[0]
    ).toMatchObject({ message: "The folder does not exist" });
  });
});
