import type { CollectionConfig, Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { moveItems } from "../../src/server/index.js";
import { countDbWrites } from "../helpers/countDbWrites.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

/**
 * Blocker 3 (spec section 5.3): a move writes only non-localized structural columns. A page keeps
 * every locale of its content, its array rows and its block rows, in the draft and in the
 * published row, because a write that carries localized data deletes the locales it does not name.
 *
 * Content is compared as the database stores it (`payload.db`, every locale at once), so a lost
 * locale row or a rewritten array row shows up even where a fallback would hide it on read.
 */

const articlesCollection: CollectionConfig = {
  slug: "articles",
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "slug", type: "text", localized: true },
    { name: "summary", type: "textarea", localized: true },
    {
      name: "sections",
      type: "array",
      fields: [
        { name: "label", type: "text", localized: true },
        { name: "note", type: "text" },
      ],
    },
    {
      name: "blocks",
      type: "blocks",
      blocks: [{ slug: "quote", fields: [{ name: "quote", type: "text", localized: true }] }],
    },
  ],
  versions: { drafts: true },
};

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({
    extraCollections: [articlesCollection],
    foldersOptions: {
      collections: { articles: true, pages: true, posts: { label: "Blog post" } } as never,
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  const { payload } = harness;
  await clearTree(payload);
  await payload.db.deleteMany({ collection: "articles" as never, where: { id: { exists: true } } });
  await payload.db.deleteVersions({
    collection: "articles" as never,
    where: { id: { exists: true } },
  });
});

type Collection = "articles" | "pages";
type Row = Record<string, unknown>;

const folderRef = (id: number) => ({ collection: "folders", id });
const itemRef = (collection: Collection, id: number) => ({ collection, id });

/**
 * The columns a move is allowed to change; everything else must come back identical. A read adds
 * `folderPath` and `fullPath`, which follow the folder and so change with the move by design.
 */
const structureKeys = new Set([
  "folder",
  "folderPath",
  "fullPath",
  "orderKey",
  "structureRevision",
  "updatedAt",
]);

const withoutStructure = (row: Row): Row =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !structureKeys.has(key)));

const readRawMain = async (payload: Payload, collection: Collection, id: number): Promise<Row> =>
  (await payload.db.findOne({
    collection: collection as never,
    locale: "all",
    where: { id: { equals: id } },
  })) as unknown as Row;

/** The raw version rows of a page by id, so the comparison never depends on their order. */
const readRawVersions = async (
  payload: Payload,
  collection: Collection,
  id: number
): Promise<Record<string, Row>> => {
  const { docs } = await payload.db.findVersions({
    collection: collection as never,
    locale: "all",
    pagination: false,
    where: { parent: { equals: id } },
  });

  return Object.fromEntries(
    (docs as unknown as Array<Row & { id: number | string }>).map((doc) => [String(doc.id), doc])
  );
};

const withoutStructureVersions = (versions: Record<string, Row>): Record<string, Row> =>
  Object.fromEntries(
    Object.entries(versions).map(([key, row]) => [
      key,
      {
        ...withoutStructure(row),
        version: withoutStructure(row.version as Row),
      },
    ])
  );

type Snapshot = { main: Row; versions: Record<string, Row> };

const snapshotOf = async (
  payload: Payload,
  collection: Collection,
  id: number
): Promise<Snapshot> => ({
  main: await readRawMain(payload, collection, id),
  versions: await readRawVersions(payload, collection, id),
});

const latestVersionOf = (versions: Record<string, Row>): Row => {
  const latest = Object.values(versions).find((row) => row.latest === true);
  expect(latest).toBeDefined();

  return (latest as Row).version as Row;
};

const idsOf = (rows: unknown): string[] =>
  (rows as Array<{ id: string }>).map((row) => String(row.id));

/**
 * A page written in both locales. `published` leaves a published row behind; the draft layer on
 * top of it (when `pendingDraft` is set) differs from it in en, so the draft and the published
 * row are two different documents.
 */
const createPageInBothLocales = async ({
  folder,
  pendingDraft,
  published,
  slug,
}: {
  folder: number | null;
  pendingDraft: boolean;
  published: boolean;
  slug: string;
}): Promise<number> => {
  const { payload } = harness;
  const status = published ? ({ _status: "published" } as const) : ({ _status: "draft" } as const);
  const page = await payload.create({
    collection: "pages",
    data: {
      ...status,
      blocks: [
        { blockType: "hero", heading: "Welcome" },
        { blockType: "content", body: "English body" },
      ],
      folder,
      slug,
      title: "Hello",
    } as never,
    depth: 0,
    draft: !published,
    overrideAccess: true,
  });
  const created = (await payload.findByID({
    collection: "pages",
    depth: 0,
    draft: true,
    id: page.id,
    locale: "en",
    overrideAccess: true,
  })) as unknown as { blocks: Array<{ id: string }> };
  await payload.update({
    collection: "pages",
    data: {
      ...status,
      blocks: [
        { id: created.blocks[0].id, blockType: "hero", heading: "Willkommen" },
        { id: created.blocks[1].id, blockType: "content", body: "Deutscher Text" },
      ],
      slug: `${slug}-de`,
      title: "Hallo",
    } as never,
    depth: 0,
    draft: !published,
    id: page.id,
    locale: "de",
    overrideAccess: true,
  });
  if (pendingDraft) {
    await payload.update({
      collection: "pages",
      data: { title: "Hello, pending draft" } as never,
      depth: 0,
      draft: true,
      id: page.id,
      locale: "en",
      overrideAccess: true,
    });
  }

  return page.id as number;
};

const createArticleInBothLocales = async (
  folder: number | null,
  slug: string,
  published: boolean
): Promise<number> => {
  const { payload } = harness;
  const status = published ? ({ _status: "published" } as const) : ({ _status: "draft" } as const);
  const article = (await payload.create({
    collection: "articles" as never,
    data: {
      ...status,
      blocks: [{ blockType: "quote", quote: "A quote" }],
      folder,
      sections: [
        { label: "One", note: "first" },
        { label: "Two", note: "second" },
        { label: "Three", note: "third" },
      ],
      slug,
      summary: "English summary",
      title: "Article",
    } as never,
    depth: 0,
    draft: !published,
    overrideAccess: true,
  })) as unknown as { id: number };
  const created = (await payload.findByID({
    collection: "articles" as never,
    depth: 0,
    draft: true,
    id: article.id,
    locale: "en",
    overrideAccess: true,
  })) as unknown as { blocks: Array<{ id: string }>; sections: Array<{ id: string }> };
  await payload.update({
    collection: "articles" as never,
    data: {
      ...status,
      blocks: [{ id: created.blocks[0].id, blockType: "quote", quote: "Ein Zitat" }],
      sections: [
        { id: created.sections[0].id, label: "Eins", note: "first" },
        { id: created.sections[1].id, label: "Zwei", note: "second" },
        { id: created.sections[2].id, label: "Drei", note: "third" },
      ],
      slug: `${slug}-de`,
      summary: "Deutsche Zusammenfassung",
      title: "Artikel",
    } as never,
    depth: 0,
    draft: !published,
    id: article.id,
    locale: "de",
    overrideAccess: true,
  });

  return article.id as number;
};

describe("moves never touch localized content", () => {
  it("a draft with en and de title, body and slug, moved, reads unchanged in both locales", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source-draft" });
    const target = await createFolder(payload, { slug: "target-draft" });
    const id = await createPageInBothLocales({
      folder: source.id,
      pendingDraft: false,
      published: false,
      slug: "hello",
    });
    const readDraftIn = async (locale: "de" | "en") =>
      (await payload.findByID({
        collection: "pages",
        depth: 0,
        draft: true,
        id,
        locale,
        overrideAccess: true,
      })) as unknown as Row & { blocks: Row[]; slug: string; title: string };
    const before = { de: await readDraftIn("de"), en: await readDraftIn("en") };
    expect(before.en).toMatchObject({ slug: "hello", title: "Hello" });
    expect(before.de).toMatchObject({ slug: "hello-de", title: "Hallo" });
    expect(before.de.blocks[1]).toMatchObject({ body: "Deutscher Text" });
    const rawBefore = await snapshotOf(payload, "pages", id);

    await moveItems(payload, { items: [itemRef("pages", id)], toFolder: target.id });

    for (const locale of ["de", "en"] as const) {
      const after = await readDraftIn(locale);
      expect(after.folder).toBe(target.id);
      expect(withoutStructure(after)).toEqual(withoutStructure(before[locale]));
    }
    const rawAfter = await snapshotOf(payload, "pages", id);
    expect(withoutStructure(rawAfter.main)).toEqual(withoutStructure(rawBefore.main));
    expect(withoutStructureVersions(rawAfter.versions)).toEqual(
      withoutStructureVersions(rawBefore.versions)
    );
    // The version rows carry the new folder, nothing else changed.
    expect(latestVersionOf(rawAfter.versions).folder).toBe(target.id);
  });

  it("the same holds for the published row", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source-published" });
    const target = await createFolder(payload, { slug: "target-published" });
    const id = await createPageInBothLocales({
      folder: source.id,
      pendingDraft: true,
      published: true,
      slug: "hello",
    });
    const readPublishedIn = async (locale: "de" | "en") =>
      (await payload.findByID({
        collection: "pages",
        depth: 0,
        draft: false,
        id,
        locale,
        overrideAccess: true,
      })) as unknown as Row & { slug: string; title: string };
    const before = { de: await readPublishedIn("de"), en: await readPublishedIn("en") };
    // The published row and the pending draft are different documents.
    expect(before.en).toMatchObject({ slug: "hello", title: "Hello" });
    expect(before.de).toMatchObject({ slug: "hello-de", title: "Hallo" });
    const rawBefore = await snapshotOf(payload, "pages", id);

    await moveItems(payload, { items: [itemRef("pages", id)], toFolder: target.id });

    for (const locale of ["de", "en"] as const) {
      const after = await readPublishedIn(locale);
      expect(after.folder).toBe(target.id);
      expect(withoutStructure(after)).toEqual(withoutStructure(before[locale]));
    }
    const rawAfter = await snapshotOf(payload, "pages", id);
    expect(withoutStructure(rawAfter.main)).toEqual(withoutStructure(rawBefore.main));
    expect(withoutStructureVersions(rawAfter.versions)).toEqual(
      withoutStructureVersions(rawBefore.versions)
    );
    // The pending draft kept its own title in en.
    const draft = (await payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id,
      locale: "en",
      overrideAccess: true,
    })) as unknown as { title: string };
    expect(draft.title).toBe("Hello, pending draft");
  });

  it("array and block rows of the draft are unchanged", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source-rows" });
    const target = await createFolder(payload, { slug: "target-rows" });
    const articleId = await createArticleInBothLocales(source.id, "rows", false);
    const pageId = await createPageInBothLocales({
      folder: source.id,
      pendingDraft: false,
      published: false,
      slug: "rows-page",
    });
    const before = {
      article: await snapshotOf(payload, "articles", articleId),
      page: await snapshotOf(payload, "pages", pageId),
    };
    const articleVersion = latestVersionOf(before.article.versions);
    expect(idsOf(articleVersion.sections)).toHaveLength(3);
    expect(idsOf(articleVersion.blocks)).toHaveLength(1);
    expect((articleVersion.sections as Array<{ label: Row }>)[2].label).toEqual({
      de: "Drei",
      en: "Three",
    });

    await moveItems(payload, {
      items: [itemRef("articles", articleId), itemRef("pages", pageId)],
      toFolder: target.id,
    });

    const after = {
      article: await snapshotOf(payload, "articles", articleId),
      page: await snapshotOf(payload, "pages", pageId),
    };
    // Same rows with the same ids, in the same order, with every locale of every row.
    expect(withoutStructureVersions(after.article.versions)).toEqual(
      withoutStructureVersions(before.article.versions)
    );
    expect(withoutStructureVersions(after.page.versions)).toEqual(
      withoutStructureVersions(before.page.versions)
    );
    const movedArticle = latestVersionOf(after.article.versions);
    expect(idsOf(movedArticle.sections)).toEqual(idsOf(articleVersion.sections));
    expect(idsOf(movedArticle.blocks)).toEqual(idsOf(articleVersion.blocks));
    expect(movedArticle.folder).toBe(target.id);
  });

  it("a folder move leaves page rows untouched", async () => {
    const { payload } = harness;
    const parent = await createFolder(payload, { slug: "section" });
    const child = await createFolder(payload, { parent: parent.id, slug: "child" });
    const newHome = await createFolder(payload, { slug: "new-home" });
    const pageIds = [
      await createPageInBothLocales({
        folder: parent.id,
        pendingDraft: true,
        published: true,
        slug: "in-parent",
      }),
      await createPageInBothLocales({
        folder: child.id,
        pendingDraft: false,
        published: false,
        slug: "in-child",
      }),
    ];
    const articleId = await createArticleInBothLocales(child.id, "in-child-article", true);
    const before = {
      article: await snapshotOf(payload, "articles", articleId),
      pages: await Promise.all(pageIds.map((id) => snapshotOf(payload, "pages", id))),
    };

    const { writes } = await countDbWrites(payload, () =>
      moveItems(payload, { items: [folderRef(parent.id)], toFolder: newHome.id })
    );

    // Not one write to a page collection or its versions, so no row of a page can have changed.
    const pageWrites = writes.filter((write) =>
      ["articles", "pages", "posts"].includes(write.collection.replace(/^_|_v$/gu, ""))
    );
    expect(pageWrites).toEqual([]);
    const after = {
      article: await snapshotOf(payload, "articles", articleId),
      pages: await Promise.all(pageIds.map((id) => snapshotOf(payload, "pages", id))),
    };
    // Compared whole, structural columns and updatedAt included.
    expect(after).toEqual(before);
    // The pages read at their new URLs because their folder's path changed.
    const moved = (await payload.findByID({
      collection: "pages",
      depth: 0,
      draft: false,
      id: pageIds[0],
      overrideAccess: true,
    })) as unknown as { fullPath: string };
    expect(moved.fullPath).toBe("/new-home/section/in-parent");
  });
});
