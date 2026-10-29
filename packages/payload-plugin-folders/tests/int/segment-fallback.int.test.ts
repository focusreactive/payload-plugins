import type { CollectionConfig, Payload, Where } from "payload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { buildSegmentWhere } from "../../src/index.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";
import { toWhereQueryString } from "../helpers/whereQuery.js";

// A collection with a required localized title and no drafts, and a localized field with a
// default: storing a fallback segment would create a de row that breaks the first and replaces the
// fallback of the second with the default.
const articles: CollectionConfig = {
  slug: "articles",
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "tagline", type: "text", defaultValue: "Default tagline", localized: true },
    { name: "slug", type: "text", localized: true },
  ],
};

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({
    extraCollections: [articles],
    foldersOptions: { collections: { articles: true, pages: true, posts: true } as never },
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  await harness?.destroy();
});

type LocalizedPage = {
  blocks?: Array<{ blockType: string; heading?: Record<string, string>; id: string }>;
  fullPath: Record<string, string>;
  id: number;
  pathSegment: Record<string, string | null>;
  slug: Record<string, string>;
  tagline?: Record<string, string>;
  title: Record<string, string | null>;
};

const readAllLocales = (payload: Payload, id: number, draft = false, collection = "pages") =>
  payload.findByID({
    collection: collection as "pages",
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

const germanWhere = (segment: string): Where =>
  buildSegmentWhere({ defaultLocale: "en", locale: "de", segment });

/** The ids of the pages the helper finds in de for `segment`. */
const findInGerman = async (segment: string, draft = false, collection = "pages") => {
  const found = await harness.payload.find({
    collection: collection as "pages",
    depth: 0,
    draft,
    locale: "de",
    overrideAccess: true,
    where: germanWhere(segment),
  });

  return found.docs.map((doc) => doc.id as number);
};

describe("segment fallback", () => {
  it("a de page without a de slug follows an en slug change", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Fall", slug: "fall-follow" });
    const page = await createPage(payload, { folder: folder.id, slug: "first" });
    expect(await findInGerman("first")).toContain(page.id);

    await setEnglishSlug(payload, page.id, "second");

    expect(await findInGerman("second")).toContain(page.id);
    expect(await findInGerman("first")).not.toContain(page.id);
    const stored = await readAllLocales(payload, page.id);
    expect(stored.pathSegment.en).toBe("second");
    expect(stored.pathSegment.de ?? null).toBeNull();
    expect(stored.fullPath).toEqual({ de: "/fall-follow/second", en: "/fall-follow/second" });
  });

  it("a de page with its own slug keeps it", async () => {
    const { payload } = harness;
    const page = await createPage(payload, { slug: "first-own" });
    await setGermanSlug(payload, page.id, "erste");

    await setEnglishSlug(payload, page.id, "second-own");

    const stored = await readAllLocales(payload, page.id);
    expect(stored.pathSegment).toEqual({ de: "erste", en: "second-own" });
    expect(stored.slug).toEqual({ de: "erste", en: "second-own" });
    // The own de segment matches in de, and the en slug does not.
    expect(await findInGerman("erste")).toContain(page.id);
    expect(await findInGerman("second-own")).not.toContain(page.id);
    expect(await findInGerman("first-own")).not.toContain(page.id);
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
    expect(after.title).toEqual({ de: "Titel", en: "Title" });
    expect(after.title).toEqual(before.title);
    expect(after.blocks).toEqual(before.blocks);
    expect(after.blocks?.[0].heading).toEqual({ de: "Held", en: "Hero" });
    expect(await findInGerman("fields-second")).toContain(page.id);
  });

  it("a draft en change refreshes de only in the draft", async () => {
    const { payload } = harness;
    const page = await payload.create({
      collection: "pages",
      data: { _status: "published", slug: "live-one", title: "Live" },
      depth: 0,
      overrideAccess: true,
    });
    expect(await findInGerman("live-one")).toContain(page.id);

    await setEnglishSlug(payload, page.id, "draft-one", true);

    // The draft read follows the new slug in de, the published read still has the old one.
    expect(await findInGerman("draft-one", true)).toContain(page.id);
    expect(await findInGerman("live-one", true)).not.toContain(page.id);
    expect(await findInGerman("live-one")).toContain(page.id);
    expect(await findInGerman("draft-one")).not.toContain(page.id);

    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "draft-one" },
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    // localizeStatus makes an en publish rebuild the published row from published locales only,
    // and de was never published. The segment is not stored for de, so nothing is lost.
    const published = await readAllLocales(payload, page.id);
    expect(published.pathSegment.en).toBe("draft-one");
    expect(published.pathSegment.de ?? null).toBeNull();
    expect(published.title.en).toBe("Live");
    expect(await findInGerman("draft-one")).toContain(page.id);
    expect(await findInGerman("live-one")).not.toContain(page.id);
    expect(await findInGerman("draft-one", true)).toContain(page.id);
  });

  it("the refresh writes one update per fallback locale", async () => {
    const { payload } = harness;
    const page = await createPage(payload, { slug: "count-first" });
    const versionCount = async () =>
      (
        await payload.countVersions({
          collection: "pages",
          overrideAccess: true,
          where: { parent: { equals: page.id } },
        })
      ).totalDocs;
    const versionsBefore = await versionCount();
    const update = vi.spyOn(payload, "update");

    await setEnglishSlug(payload, page.id, "count-second");

    // Fallback is applied in the query now: the save is the only update, writes no de locale row
    // and creates one version row.
    expect(update.mock.calls).toHaveLength(1);
    update.mockRestore();
    expect(await versionCount()).toBe(versionsBefore + 1);
    const stored = await readAllLocales(payload, page.id);
    expect(stored.pathSegment.de ?? null).toBeNull();
    expect(stored.title.de ?? null).toBeNull();
    expect(Object.keys(stored.slug)).toEqual(["en"]);
    expect(await findInGerman("count-second")).toContain(page.id);

    await setGermanSlug(payload, page.id, "zaehlen");
    await setEnglishSlug(payload, page.id, "count-third");
    expect((await readAllLocales(payload, page.id)).pathSegment).toEqual({
      de: "zaehlen",
      en: "count-third",
    });
  });

  it("after an en publish with de published but without a de slug, de still finds the page", async () => {
    const { payload } = harness;
    const page = await payload.create({
      collection: "pages",
      data: { _status: "published", slug: "both-first", title: "Both" },
      depth: 0,
      overrideAccess: true,
    });
    await payload.update({
      collection: "pages",
      data: { _status: "published", title: "Beide" },
      depth: 0,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });

    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "both-second" },
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect(await findInGerman("both-second")).toContain(page.id);
    expect(await findInGerman("both-first")).not.toContain(page.id);
  });

  it("a page with no de locale row at all is found in de", async () => {
    const { payload } = harness;
    const page = await createPage(payload, { slug: "no-row" });

    const stored = await readAllLocales(payload, page.id);
    expect(Object.keys(stored.slug)).toEqual(["en"]);
    expect(await findInGerman("no-row")).toContain(page.id);
    // The helper does not widen en: a de-only match would be wrong there.
    const inEnglish = await payload.find({
      collection: "pages",
      locale: "en",
      overrideAccess: true,
      where: buildSegmentWhere({ defaultLocale: "en", locale: "en", segment: "no-row" }),
    });
    expect(inEnglish.docs.map((doc) => doc.id)).toContain(page.id);
  });

  it("the same where sent over REST finds the page in de", async () => {
    const { config, payload } = harness;
    const folder = await createFolder(payload, { name: "Rest", slug: "rest-fallback" });
    const fallbackPage = await createPage(payload, { folder: folder.id, slug: "rest-post" });
    const ownPage = await createPage(payload, { folder: folder.id, slug: "rest-own" });
    await setGermanSlug(payload, ownPage.id, "rest-eigen");

    const where: Where = {
      and: [
        { folderPath: { equals: "/rest-fallback" } },
        { isFolderRoot: { not_equals: true } },
        germanWhere("rest-post"),
      ],
    };
    const found = await callEndpoint<{ docs: Array<{ id: number }> }>({
      config,
      path: `/pages?${toWhereQueryString(where, { locale: "de" })}`,
      payload,
    });
    expect(found.status).toBe(200);
    expect(found.body.docs.map((doc) => doc.id)).toEqual([fallbackPage.id]);

    const ownWhere: Where = {
      and: [{ folderPath: { equals: "/rest-fallback" } }, germanWhere("rest-own")],
    };
    const notFound = await callEndpoint<{ docs: Array<{ id: number }> }>({
      config,
      path: `/pages?${toWhereQueryString(ownWhere, { locale: "de" })}`,
      payload,
    });
    expect(notFound.body.docs).toEqual([]);

    // The raw where documented for non-JS clients.
    const raw = await callEndpoint<{ docs: Array<{ id: number }> }>({
      config,
      path:
        "/pages?locale=de&where[folderPath][equals]=/rest-fallback" +
        "&where[or][0][pathSegment][equals]=rest-post" +
        "&where[or][1][and][0][pathSegment][exists]=false" +
        "&where[or][1][and][1][pathSegment.en][equals]=rest-post",
      payload,
    });
    expect(raw.body.docs.map((doc) => doc.id)).toEqual([fallbackPage.id]);
  });

  it("a collection with a required localized title and no drafts can be created and keeps its fallback", async () => {
    const { payload } = harness;
    const article = (await payload.create({
      collection: "articles" as never,
      data: { slug: "article-one", tagline: "English tagline", title: "Article" } as never,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };

    const stored = await readAllLocales(payload, article.id, false, "articles");
    expect(stored.pathSegment.en).toBe("article-one");
    expect(stored.title.de ?? null).toBeNull();

    await payload.update({
      collection: "articles" as never,
      data: { slug: "article-two" } as never,
      depth: 0,
      id: article.id,
      overrideAccess: true,
    });

    // de reads en's value, not the field default a stored de row would carry.
    const german = (await payload.findByID({
      collection: "articles" as never,
      depth: 0,
      id: article.id,
      locale: "de",
      overrideAccess: true,
    })) as unknown as { tagline: string; title: string };
    expect(german.tagline).toBe("English tagline");
    expect(german.title).toBe("Article");
    expect(await findInGerman("article-two", false, "articles")).toContain(article.id);
    expect(await findInGerman("article-one", false, "articles")).not.toContain(article.id);
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

    expect(await findInGerman("request-second")).toContain(page.id);
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

  it("a folder refuses a segment that a de page inherits from its en slug", async () => {
    const { payload } = harness;
    const parent = await createFolder(payload);
    const folder = await createFolder(payload, { name: "Info", parent: parent.id, slug: "info" });
    await createPage(payload, { folder: parent.id, slug: "contact" });

    let failure: unknown;
    try {
      await payload.update({
        collection: "folders",
        data: { name: "Kontakt", slug: "contact" },
        id: folder.id,
        locale: "de",
        overrideAccess: true,
      });
    } catch (error) {
      failure = error;
    }

    const errors = (failure as { data?: { errors?: Array<{ message: string; path: string }> } })
      ?.data?.errors;
    expect(errors?.[0]).toMatchObject({
      message: `/${parent.slug}/contact is already used by a page`,
      path: "slug",
    });
  });
});
