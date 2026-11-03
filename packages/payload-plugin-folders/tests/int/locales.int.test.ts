import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildSegmentWhere } from "../../src/index.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createPage, uniqueName } from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

type Locale = "de" | "en";

/** A page's `fullPath` as one locale reads it, the published row or the latest draft. */
const readPagePath = async (
  payload: Payload,
  id: number,
  locale: Locale,
  draft = false
): Promise<string | null> => {
  const doc = (await payload.findByID({
    collection: "pages",
    depth: 0,
    draft,
    id,
    locale,
    overrideAccess: true,
  })) as unknown as { fullPath: string | null };

  return doc.fullPath;
};

const readFolderPath = async (payload: Payload, id: number, locale: Locale): Promise<string> => {
  const doc = (await payload.findByID({
    collection: "folders",
    depth: 0,
    id,
    locale,
    overrideAccess: true,
  })) as unknown as { fullPath: string };

  return doc.fullPath;
};

const storedPageValues = (payload: Payload, id: number) =>
  payload.findByID({
    collection: "pages",
    depth: 0,
    id,
    locale: "all" as never,
    overrideAccess: true,
  }) as unknown as Promise<{
    pathSegment: Record<string, string | null | undefined>;
    slug: Record<string, string | undefined>;
  }>;

const countVersions = async (payload: Payload, id: number): Promise<number> =>
  (
    await payload.countVersions({
      collection: "pages",
      overrideAccess: true,
      where: { parent: { equals: id } },
    })
  ).totalDocs;

const renameFolderIn = (
  payload: Payload,
  id: number,
  data: { name: string; slug: string },
  locale: Locale
) =>
  payload.update({
    collection: "folders",
    data,
    depth: 0,
    id,
    locale,
    overrideAccess: true,
  });

const createPublishedPage = (
  payload: Payload,
  data: { folder?: number | null; isFolderRoot?: boolean; slug: string; title?: string }
) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder: null, title: data.slug, ...data },
    depth: 0,
    overrideAccess: true,
  });

const publishIn = (
  payload: Payload,
  id: number,
  locale: Locale,
  data: { slug?: string; title?: string }
) =>
  payload.update({
    collection: "pages",
    data: { _status: "published", ...data },
    depth: 0,
    id,
    locale,
    overrideAccess: true,
  });

const saveDraftIn = (payload: Payload, id: number, locale: Locale, data: { slug?: string }) =>
  payload.update({
    collection: "pages",
    data,
    depth: 0,
    draft: true,
    id,
    locale,
    overrideAccess: true,
  });

/** The ids of the pages that a lookup by effective segment finds in `locale`, with that locale's published filter. */
const findBySegmentIn = async (
  payload: Payload,
  locale: Locale,
  segment: string,
  draft = false
): Promise<number[]> => {
  const found = await payload.find({
    collection: "pages",
    depth: 0,
    draft,
    locale,
    overrideAccess: true,
    where: buildSegmentWhere({ defaultLocale: "en", locale, segment }),
  });

  return found.docs.map((doc) => doc.id as number);
};

describe("locale matrix", () => {
  it("a translated folder slug composes into descendants and the root page", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { name: "Blog", slug: uniqueName("blog") });
    const year = await createFolder(payload, { name: "Year", parent: blog.id, slug: "2026" });
    const home = await createPublishedPage(payload, {
      folder: blog.id,
      isFolderRoot: true,
      slug: "home",
    });
    const team = await createPublishedPage(payload, { folder: blog.id, slug: "team" });
    const newYear = await createPublishedPage(payload, { folder: year.id, slug: "new-year" });
    const versionsBefore = await Promise.all(
      [home, team, newYear].map((page) => countVersions(payload, page.id as number))
    );

    await renameFolderIn(payload, blog.id, { name: "Aktuelles", slug: "aktuelles" }, "de");

    expect(await readFolderPath(payload, year.id, "de")).toBe("/aktuelles/2026");
    expect(await readPagePath(payload, home.id as number, "de")).toBe("/aktuelles");
    expect(await readPagePath(payload, team.id as number, "de")).toBe("/aktuelles/team");
    expect(await readPagePath(payload, newYear.id as number, "de")).toBe(
      "/aktuelles/2026/new-year"
    );
    // en keeps the en slug of the folder, and no page was written.
    expect(await readPagePath(payload, team.id as number, "en")).toBe(`/${blog.slug}/team`);
    expect(await readPagePath(payload, home.id as number, "en")).toBe(`/${blog.slug}`);
    expect(
      await Promise.all(
        [home, team, newYear].map((page) => countVersions(payload, page.id as number))
      )
    ).toEqual(versionsBefore);
  });

  it("a page without a de slug falls back", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Fallback", slug: uniqueName("fallback") });
    const fallbackPage = await createPage(payload, { folder: folder.id, slug: "contact" });
    const ownPage = await createPage(payload, { folder: folder.id, slug: "about" });
    await payload.update({
      collection: "pages",
      data: { slug: "ueber", title: "Ueber" },
      depth: 0,
      id: ownPage.id,
      locale: "de",
      overrideAccess: true,
    });

    // No de segment is stored for the page that has none, and the de path is the en one.
    expect((await storedPageValues(payload, fallbackPage.id)).pathSegment.de ?? null).toBeNull();
    expect(await readPagePath(payload, fallbackPage.id, "de")).toBe(`/${folder.slug}/contact`);
    expect(await readPagePath(payload, fallbackPage.id, "en")).toBe(`/${folder.slug}/contact`);
    expect(await findBySegmentIn(payload, "de", "contact")).toContain(fallbackPage.id);
    // The page with its own de slug reads it in de only.
    expect(await readPagePath(payload, ownPage.id, "de")).toBe(`/${folder.slug}/ueber`);
    expect(await readPagePath(payload, ownPage.id, "en")).toBe(`/${folder.slug}/about`);
    expect(await findBySegmentIn(payload, "de", "about")).not.toContain(ownPage.id);
    expect(await findBySegmentIn(payload, "de", "ueber")).toContain(ownPage.id);
  });

  it("publishing a de slug change alone changes only de", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Alone", slug: uniqueName("alone") });
    const page = await createPublishedPage(payload, { folder: folder.id, slug: "report" });
    await publishIn(payload, page.id as number, "de", { title: "Bericht" });
    expect(await readPagePath(payload, page.id as number, "de")).toBe(`/${folder.slug}/report`);

    await publishIn(payload, page.id as number, "de", { slug: "bericht" });

    expect(await readPagePath(payload, page.id as number, "de")).toBe(`/${folder.slug}/bericht`);
    expect(await readPagePath(payload, page.id as number, "en")).toBe(`/${folder.slug}/report`);
    const stored = await storedPageValues(payload, page.id as number);
    expect(stored.pathSegment).toEqual({ de: "bericht", en: "report" });
  });

  it("publishing an en slug change alone leaves the published de path of a fallback page as documented in spec §8", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Documented", slug: uniqueName("doc") });
    // Spec section 8, with decision 19: the de segment is not stored, so a fallback locale follows
    // an en publish at once when de is live too, either published itself (liveInDe) or served
    // through the fallback because de has no status of its own (enOnly).
    const liveInDe = await createPublishedPage(payload, { folder: folder.id, slug: "first" });
    await publishIn(payload, liveInDe.id as number, "de", { title: "Erste" });
    const enOnly = await createPublishedPage(payload, { folder: folder.id, slug: "single" });
    // Unpublished in de: its own de status is draft, so it is not live there whatever en does.
    const unpublishedInDe = await createPublishedPage(payload, {
      folder: folder.id,
      slug: "other",
    });
    await publishIn(payload, unpublishedInDe.id as number, "de", { title: "Andere" });
    await payload.update({
      collection: "pages",
      data: { _status: "draft" },
      depth: 0,
      id: unpublishedInDe.id,
      locale: "de",
      overrideAccess: true,
    });

    await publishIn(payload, liveInDe.id as number, "en", { slug: "second" });
    await publishIn(payload, enOnly.id as number, "en", { slug: "double" });
    await publishIn(payload, unpublishedInDe.id as number, "en", { slug: "another" });

    expect(await readPagePath(payload, liveInDe.id as number, "en")).toBe(`/${folder.slug}/second`);
    expect(await readPagePath(payload, liveInDe.id as number, "de")).toBe(`/${folder.slug}/second`);
    expect(await readPagePath(payload, enOnly.id as number, "de")).toBe(`/${folder.slug}/double`);
    // Its de path is not live (spec section 8: it moves only when de is published too); the stored
    // status says so, and resolve answers notFound for it in de (tests/int/resolve.int.test.ts).
    expect(await readPagePath(payload, unpublishedInDe.id as number, "en")).toBe(
      `/${folder.slug}/another`
    );
    const unpublishedStatus = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: unpublishedInDe.id,
      locale: "all" as never,
      overrideAccess: true,
    })) as unknown as { _status: Record<string, string> };
    expect(unpublishedStatus._status).toEqual({ de: "draft", en: "published" });
    // Nothing was written for de: the published de row holds no segment, so nothing can go stale.
    for (const page of [liveInDe, enOnly, unpublishedInDe]) {
      expect(
        (await storedPageValues(payload, page.id as number)).pathSegment.de ?? null
      ).toBeNull();
    }
    // A de lookup by the old segment finds none of them.
    expect(await findBySegmentIn(payload, "de", "first")).not.toContain(liveInDe.id);
    expect(await findBySegmentIn(payload, "de", "second")).toContain(liveInDe.id);
  });

  it("a default-locale folder rename updates fallback locales", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Old", slug: uniqueName("old") });
    const child = await createFolder(payload, { name: "Child", parent: folder.id, slug: "child" });
    const page = await createPublishedPage(payload, { folder: child.id, slug: "post" });
    const ownChild = await createFolder(payload, {
      name: "Own",
      parent: folder.id,
      slug: "own-child",
    });
    await renameFolderIn(payload, ownChild.id, { name: "Eigen", slug: "eigen" }, "de");
    const ownPage = await createPublishedPage(payload, { folder: ownChild.id, slug: "own-post" });
    expect(await readPagePath(payload, page.id as number, "de")).toBe(`/${folder.slug}/child/post`);

    await renameFolderIn(payload, folder.id, { name: "New", slug: "renamed" }, "en");

    expect(await readFolderPath(payload, folder.id, "de")).toBe("/renamed");
    expect(await readFolderPath(payload, child.id, "de")).toBe("/renamed/child");
    expect(await readPagePath(payload, page.id as number, "de")).toBe("/renamed/child/post");
    expect(await readPagePath(payload, page.id as number, "en")).toBe("/renamed/child/post");
    // A subfolder with its own de slug keeps it under the renamed parent.
    expect(await readFolderPath(payload, ownChild.id, "de")).toBe("/renamed/eigen");
    expect(await readFolderPath(payload, ownChild.id, "en")).toBe("/renamed/own-child");
    expect(await readPagePath(payload, ownPage.id as number, "de")).toBe("/renamed/eigen/own-post");
  });

  it("uniqueness is per locale", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Unique", slug: uniqueName("unique") });
    const first = await createPublishedPage(payload, { folder: folder.id, slug: "news" });
    const second = await createPublishedPage(payload, { folder: folder.id, slug: "latest" });

    // "news" is taken in en and, through the fallback, in de: the clash is the de one.
    let germanClash: unknown;
    try {
      await publishIn(payload, second.id as number, "de", { slug: "news", title: "Neues" });
    } catch (error) {
      germanClash = error;
    }
    const errors = (
      germanClash as { data?: { errors?: Array<{ locale?: string; message: string }> } }
    )?.data?.errors;
    expect(errors?.map((error) => error.locale)).toEqual(["de"]);
    expect(errors?.[0].message).toContain(`/${folder.slug}/news is already used by`);

    // The same slug is free in the locale where nobody has it: de "latest" is the page's en slug,
    // and the first page takes it in de only through its own de slug.
    await publishIn(payload, first.id as number, "de", { slug: "aktuell", title: "Aktuell" });
    await publishIn(payload, second.id as number, "de", { slug: "news", title: "Neues" });
    expect(await readPagePath(payload, second.id as number, "de")).toBe(`/${folder.slug}/news`);
    expect(await readPagePath(payload, first.id as number, "en")).toBe(`/${folder.slug}/news`);
    expect(await readPagePath(payload, second.id as number, "en")).toBe(`/${folder.slug}/latest`);
    expect(await findBySegmentIn(payload, "de", "news")).toEqual([second.id]);
    expect(await findBySegmentIn(payload, "en", "news")).toEqual([first.id]);
  });

  it("draft reads per locale use draft segments", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Drafts", slug: uniqueName("drafts") });
    const page = await createPublishedPage(payload, { folder: folder.id, slug: "live" });
    const id = page.id as number;
    await publishIn(payload, id, "de", { slug: "live-de", title: "Live" });

    await saveDraftIn(payload, id, "en", { slug: "draft-en" });
    await saveDraftIn(payload, id, "de", { slug: "entwurf-de" });

    // The published read keeps both live segments, per locale.
    expect(await readPagePath(payload, id, "en")).toBe(`/${folder.slug}/live`);
    expect(await readPagePath(payload, id, "de")).toBe(`/${folder.slug}/live-de`);
    // The draft read gives each locale its own draft segment.
    expect(await readPagePath(payload, id, "en", true)).toBe(`/${folder.slug}/draft-en`);
    expect(await readPagePath(payload, id, "de", true)).toBe(`/${folder.slug}/entwurf-de`);
    expect(await findBySegmentIn(payload, "de", "entwurf-de", true)).toContain(id);
    expect(await findBySegmentIn(payload, "de", "entwurf-de")).not.toContain(id);
    expect(await findBySegmentIn(payload, "en", "draft-en", true)).toContain(id);
    expect(await findBySegmentIn(payload, "de", "live-de")).toContain(id);
  });
});
