import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { MoveBlockedError } from "../../src/core/move.js";
import { isTreeLockHeld } from "../../src/core/treeLock.js";
import { moveItems } from "../../src/server/index.js";
import type { PathChange, PathChangeReason } from "../../src/types.js";
import { countDbWrites } from "../helpers/countDbWrites.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";

type Recorded = { changes: PathChange[]; reason: PathChangeReason };

const recorded: Recorded[] = [];

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({
    foldersOptions: {
      hooks: {
        afterPathChange: ({ changes, reason }) => {
          recorded.push({ changes, reason });
        },
      },
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  recorded.length = 0;
  vi.restoreAllMocks();
  await clearTree(harness.payload);
});

/**
 * A second app with a page collection that has `versions: true` and no drafts: it has versions but
 * no `latest` flag, so a move must not look for a latest version. It gets its own harness, run and
 * destroyed inside the test, so the file holds no extra database pool while the others run.
 */
const withNotesApp = async (work: (payload: Payload) => Promise<void>): Promise<void> => {
  const notesApp = await getTestPayload({
    extraCollections: [
      {
        slug: "notes",
        fields: [
          { name: "title", type: "text" },
          { name: "slug", type: "text" },
        ],
        versions: true,
      },
    ],
    foldersOptions: {
      collections: { notes: true, pages: true, posts: { label: "Blog post" } } as never,
    },
  });
  try {
    await work(notesApp.payload);
  } finally {
    await notesApp.destroy();
  }
};

const folderRef = (id: number) => ({ collection: "folders", id });
const pageRef = (id: number) => ({ collection: "pages", id });
const postRef = (id: number) => ({ collection: "posts", id });

type PageStructure = { folder: number | null; orderKey: string | null; structureRevision: number };

const readMainRow = async (payload: Payload, id: number) =>
  (await payload.findByID({
    collection: "pages",
    depth: 0,
    draft: false,
    id,
    overrideAccess: true,
  })) as unknown as PageStructure & { fullPath: string | null; updatedAt: string };

const readLatestVersion = async (payload: Payload, id: number) => {
  const { docs } = await payload.findVersions({
    collection: "pages",
    depth: 0,
    limit: 1,
    locale: "all",
    overrideAccess: true,
    where: { and: [{ parent: { equals: id } }, { latest: { equals: true } }] },
  });

  return docs[0] as unknown as {
    updatedAt: string;
    version: PageStructure & { title: Record<string, string> };
  };
};

const readFullPath = async (
  payload: Payload,
  collection: "pages" | "posts",
  id: number,
  locale: "de" | "en" = "en"
): Promise<string | null | undefined> =>
  (
    (await payload.findByID({
      collection,
      depth: 0,
      draft: true,
      id,
      locale,
      overrideAccess: true,
    })) as unknown as { fullPath?: string | null }
  ).fullPath;

type FolderRow = {
  allowedTypes: string[] | null;
  ancestorIds: string;
  depth: number;
  fullPath: Record<string, string>;
  lockSubfolderTypes: boolean | null;
  orderKey: string;
  parent: number | null;
  structureRevision: number;
  typesLockedBy: number | null;
};

const readFolderRow = async (payload: Payload, id: number): Promise<FolderRow> =>
  (await payload.db.findOne({
    collection: "folders",
    locale: "all",
    where: { id: { equals: id } },
  })) as unknown as FolderRow;

const readTreeRevision = async (payload: Payload): Promise<number> =>
  (
    (await payload.db.findGlobal({ slug: "folders-tree-state" as never })) as {
      revision?: number | null;
    }
  ).revision ?? 0;

/** The ids of a folder's page children in tree order. */
const listPagesIn = async (payload: Payload, folderId: number | null): Promise<number[]> => {
  const { docs } = await payload.find({
    collection: "pages",
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: "orderKey",
    where: { folder: folderId === null ? { exists: false } : { equals: folderId } },
  });

  return docs.map((doc) => doc.id);
};

const createPublishedPage = async (
  payload: Payload,
  data: { deSlug?: string; folder: number | null; slug: string; title: string }
): Promise<{ id: number }> => {
  const page = await payload.create({
    collection: "pages",
    data: {
      _status: "published",
      folder: data.folder,
      slug: data.slug,
      title: data.title,
    } as never,
    depth: 0,
    overrideAccess: true,
  });
  if (data.deSlug) {
    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: data.deSlug, title: data.title } as never,
      depth: 0,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });
  }

  return page as unknown as { id: number };
};

describe("move apply", () => {
  it("moves a page to the top of a folder", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "docs" });
    const older = await createPage(payload, { folder: target.id, slug: "older" });
    const newer = await createPage(payload, { folder: target.id, slug: "newer" });
    const loose = await createPage(payload, { slug: "loose" });
    const revisionBefore = await readTreeRevision(payload);

    const result = await moveItems(payload, { items: [pageRef(loose.id)], toFolder: target.id });

    expect(await listPagesIn(payload, target.id)).toEqual([loose.id, newer.id, older.id]);
    const moved = await readMainRow(payload, loose.id);
    expect(moved).toMatchObject({ folder: target.id, structureRevision: 1 });
    expect(moved.orderKey).toBe(result.orderKeys[`pages:${loose.id}`]);
    expect(await readFullPath(payload, "pages", loose.id)).toBe("/docs/loose");
    expect(result.moved).toEqual([pageRef(loose.id)]);
    expect(result.structureRevisions).toEqual({ [`pages:${loose.id}`]: 1 });
    expect(result.revision).toBe(revisionBefore + 1);
    expect(await readTreeRevision(payload)).toBe(result.revision);
  });

  it("moves a page to the top level of the tree", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "docs" });
    const page = await createPublishedPage(payload, {
      folder: source.id,
      slug: "guide",
      title: "Guide",
    });

    await moveItems(payload, { items: [pageRef(page.id)], toFolder: null });

    expect((await readMainRow(payload, page.id)).folder).toBeNull();
    expect((await readLatestVersion(payload, page.id)).version.folder).toBeNull();
    expect(await readFullPath(payload, "pages", page.id)).toBe("/guide");
  });

  it("moves after a sibling", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "docs" });
    for (const slug of ["c", "b", "a"]) {
      await createPage(payload, { folder: target.id, slug });
    }
    const [first, second, third] = await listPagesIn(payload, target.id);
    const loose = await createPage(payload, { slug: "loose" });

    await moveItems(payload, { after: pageRef(first), items: [pageRef(loose.id)] });
    expect(await listPagesIn(payload, target.id)).toEqual([first, loose.id, second, third]);

    // After the last sibling, and after a sibling that is a folder in the same list.
    await moveItems(payload, { after: pageRef(third), items: [pageRef(loose.id)] });
    expect(await listPagesIn(payload, target.id)).toEqual([first, second, third, loose.id]);
    const subfolder = await createFolder(payload, { parent: target.id, slug: "sub" });
    const other = await createPage(payload, { slug: "other" });
    await moveItems(payload, { after: folderRef(subfolder.id), items: [pageRef(other.id)] });
    const other_ = await readMainRow(payload, other.id);
    const subfolderRow = await readFolderRow(payload, subfolder.id);
    expect(other_.folder).toBe(target.id);
    expect(other_.orderKey! > subfolderRow.orderKey).toBe(true);
  });

  it("a bulk move keeps the given order", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "docs" });
    const existing = await createPage(payload, { folder: target.id, slug: "existing" });
    const [one, two, three] = await Promise.all(
      ["one", "two", "three"].map((slug) => createPage(payload, { slug }))
    );

    const result = await moveItems(payload, {
      items: [pageRef(three.id), pageRef(one.id), pageRef(two.id)],
      position: "end",
      toFolder: target.id,
    });

    expect(await listPagesIn(payload, target.id)).toEqual([existing.id, three.id, one.id, two.id]);
    expect(result.moved).toEqual([pageRef(three.id), pageRef(one.id), pageRef(two.id)]);
    const keys = [three.id, one.id, two.id].map((id) => result.orderKeys[`pages:${id}`]);
    expect([...keys].sort()).toEqual(keys);
  });

  it("moves a folder and a page together", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "company" });
    const team = await createFolder(payload, { name: "Team", slug: "team" });
    await payload.update({
      collection: "folders",
      data: { name: "Mannschaft", slug: "mannschaft" },
      id: team.id,
      locale: "de",
      overrideAccess: true,
    });
    const members = await createFolder(payload, { parent: team.id, slug: "members" });
    const deep = await createPublishedPage(payload, {
      folder: members.id,
      slug: "roster",
      title: "Roster",
    });
    const loose = await createPublishedPage(payload, {
      deSlug: "hallo",
      folder: null,
      slug: "hello",
      title: "Hello",
    });

    // What the setup reported is not what the move reports.
    recorded.length = 0;

    const result = await moveItems(payload, {
      items: [folderRef(team.id), pageRef(loose.id)],
      toFolder: target.id,
    });

    const teamRow = await readFolderRow(payload, team.id);
    expect(teamRow).toMatchObject({
      ancestorIds: `/${target.id}/`,
      depth: 2,
      parent: target.id,
      structureRevision: 1,
    });
    expect(teamRow.fullPath).toMatchObject({ de: "/company/mannschaft", en: "/company/team" });
    const membersRow = await readFolderRow(payload, members.id);
    expect(membersRow).toMatchObject({
      ancestorIds: `/${target.id}/${team.id}/`,
      depth: 3,
      parent: team.id,
      structureRevision: 0,
    });
    expect(membersRow.fullPath).toMatchObject({
      de: "/company/mannschaft/members",
      en: "/company/team/members",
    });
    expect(await readFullPath(payload, "pages", deep.id)).toBe("/company/team/members/roster");
    expect(await readFullPath(payload, "pages", loose.id)).toBe("/company/hello");
    expect(await readFullPath(payload, "pages", loose.id, "de")).toBe("/company/hallo");

    const changeFor = (id: number, collection: string, locale: string) =>
      result.changes.find(
        (change) => change.id === id && change.collection === collection && change.locale === locale
      );
    expect(changeFor(team.id, "folders", "en")).toMatchObject({
      from: "/team",
      published: true,
      to: "/company/team",
    });
    expect(changeFor(members.id, "folders", "de")?.to).toBe("/company/mannschaft/members");
    expect(changeFor(deep.id, "pages", "en")).toMatchObject({
      from: "/team/members/roster",
      published: true,
      to: "/company/team/members/roster",
    });
    expect(changeFor(loose.id, "pages", "de")).toMatchObject({
      from: "/hallo",
      to: "/company/hallo",
    });
    expect(result.moved).toEqual([folderRef(team.id), pageRef(loose.id)]);

    // One call to the host, after the commit, with everything that changed.
    expect(recorded).toHaveLength(1);
    expect(recorded[0].reason).toBe("move");
    expect(recorded[0].changes).toEqual(result.changes);
    expect(result.changes.every((change) => change.from !== change.to)).toBe(true);
  });

  it("a reorder changes no path", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const first = await createPublishedPage(payload, {
      folder: docs.id,
      slug: "first",
      title: "First",
    });
    const second = await createPublishedPage(payload, {
      folder: docs.id,
      slug: "second",
      title: "Second",
    });
    const folderOne = await createFolder(payload, { parent: docs.id, slug: "one" });
    const folderTwo = await createFolder(payload, { parent: docs.id, slug: "two" });
    const pathsBefore = {
      first: await readFullPath(payload, "pages", first.id),
      folderOne: (await readFolderRow(payload, folderOne.id)).fullPath,
      second: await readFullPath(payload, "pages", second.id),
    };
    const orderBefore = await listPagesIn(payload, docs.id);

    const pageResult = await moveItems(payload, {
      items: [pageRef(orderBefore[0])],
      position: "end",
      toFolder: docs.id,
    });
    const folderResult = await moveItems(payload, {
      items: [folderRef(folderTwo.id)],
      position: "end",
      toFolder: docs.id,
    });
    await moveItems(payload, { after: folderRef(folderTwo.id), items: [folderRef(folderOne.id)] });

    expect(await listPagesIn(payload, docs.id)).toEqual([orderBefore[1], orderBefore[0]]);
    expect(pageResult.changes).toEqual([]);
    expect(folderResult.changes).toEqual([]);
    expect(recorded).toEqual([]);
    expect(await readFullPath(payload, "pages", first.id)).toBe(pathsBefore.first);
    expect(await readFullPath(payload, "pages", second.id)).toBe(pathsBefore.second);
    const folderOneRow = await readFolderRow(payload, folderOne.id);
    expect(folderOneRow.fullPath).toEqual(pathsBefore.folderOne);
    expect(folderOneRow).toMatchObject({ ancestorIds: `/${docs.id}/`, structureRevision: 1 });
    expect(
      (await readFolderRow(payload, folderOne.id)).orderKey >
        (await readFolderRow(payload, folderTwo.id)).orderKey
    ).toBe(true);
  });

  it("publishing a pending draft after a move keeps the new folder", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source" });
    const target = await createFolder(payload, { slug: "target" });
    const page = await createPublishedPage(payload, {
      folder: source.id,
      slug: "story",
      title: "Story",
    });
    await payload.update({
      collection: "pages",
      data: { title: "Pending draft" } as never,
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });
    // The form an editor opened before the move.
    const staleForm = (await payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    })) as unknown as PageStructure & { title: string };
    expect(staleForm.folder).toBe(source.id);

    await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });

    // A draft read right after the move agrees with the tree: the latest version was patched.
    const draftRead = (await payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    })) as unknown as PageStructure & { title: string };
    expect(draftRead).toMatchObject({ folder: target.id, title: "Pending draft" });

    await payload.update({
      collection: "pages",
      data: {
        _status: "published",
        folder: staleForm.folder,
        orderKey: staleForm.orderKey,
        structureRevision: staleForm.structureRevision,
        title: staleForm.title,
      } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    const published = await readMainRow(payload, page.id);
    expect(published).toMatchObject({ folder: target.id, structureRevision: 1 });
    expect((await readLatestVersion(payload, page.id)).version.folder).toBe(target.id);
    expect(await readFullPath(payload, "pages", page.id)).toBe("/target/story");
  });

  it("a moved page's updatedAt changes", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "docs" });
    const page = await createPublishedPage(payload, {
      folder: null,
      slug: "guide",
      title: "Guide",
    });
    // Pinned to the past, so the check never races the clock.
    const longAgo = "2020-01-01T00:00:00.000Z";
    await payload.db.updateOne({
      collection: "pages",
      data: { updatedAt: longAgo },
      id: page.id,
      returning: false,
    });
    const { docs } = await payload.db.findVersions({
      collection: "pages",
      limit: 1,
      where: { and: [{ parent: { equals: page.id } }, { latest: { equals: true } }] },
    });
    await payload.db.updateVersion({
      collection: "pages",
      id: docs[0].id,
      returning: false,
      versionData: { updatedAt: longAgo, version: {} },
    } as never);
    expect((await readMainRow(payload, page.id)).updatedAt).toBe(longAgo);

    await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });

    expect((await readMainRow(payload, page.id)).updatedAt > longAgo).toBe(true);
    expect((await readLatestVersion(payload, page.id)).updatedAt > longAgo).toBe(true);
  });

  it("a failure injected after the folder writes leaves no folder or page changed", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "company" });
    const team = await createFolder(payload, { slug: "team" });
    const members = await createFolder(payload, { parent: team.id, slug: "members" });
    const page = await createPublishedPage(payload, {
      folder: null,
      slug: "hello",
      title: "Hello",
    });
    const teamBefore = await readFolderRow(payload, team.id);
    const membersBefore = await readFolderRow(payload, members.id);
    const pageBefore = await readMainRow(payload, page.id);
    const versionBefore = await readLatestVersion(payload, page.id);
    const revisionBefore = await readTreeRevision(payload);

    const calls: string[] = [];
    const originalUpdateOne = payload.db.updateOne.bind(payload.db);
    const spy = vi.spyOn(payload.db, "updateOne").mockImplementation((args) => {
      calls.push(String(args.collection));
      if (args.collection === "pages") {
        return Promise.reject(new Error("injected failure after the folder writes"));
      }

      return originalUpdateOne(args);
    });
    await expect(
      moveItems(payload, {
        items: [folderRef(team.id), pageRef(page.id)],
        toFolder: target.id,
      })
    ).rejects.toThrow("injected failure after the folder writes");
    spy.mockRestore();

    // The folder rows were written before the failure, so the rollback is what undid them.
    expect(calls.filter((collection) => collection === "folders").length).toBeGreaterThanOrEqual(2);
    expect(await readFolderRow(payload, team.id)).toEqual(teamBefore);
    expect(await readFolderRow(payload, members.id)).toEqual(membersBefore);
    expect(await readMainRow(payload, page.id)).toEqual(pageBefore);
    expect(await readLatestVersion(payload, page.id)).toEqual(versionBefore);
    expect(await readTreeRevision(payload)).toBe(revisionBefore);
    expect(recorded).toEqual([]);
    expect(isTreeLockHeld(payload)).toBe(false);

    // The same move succeeds afterwards: nothing was left half done.
    await moveItems(payload, {
      items: [folderRef(team.id), pageRef(page.id)],
      toFolder: target.id,
    });
    expect((await readFolderRow(payload, members.id)).fullPath.en).toBe("/company/team/members");
    expect(recorded).toHaveLength(1);
  });

  it("refuses a blocked move with the reason and writes nothing", async () => {
    const { payload } = harness;
    const top = await createFolder(payload, { slug: "top" });
    const child = await createFolder(payload, { parent: top.id, slug: "child" });
    const news = await createFolder(payload, { slug: "news" });
    const page = await createPublishedPage(payload, {
      folder: null,
      slug: "hello",
      title: "Hello",
    });
    await createPublishedPage(payload, { folder: news.id, slug: "hello", title: "Existing" });

    const failure = async (work: Promise<unknown>): Promise<MoveBlockedError> => {
      try {
        await work;
      } catch (error) {
        return error as MoveBlockedError;
      }
      throw new Error("expected the move to be refused");
    };
    const { result, writes } = await countDbWrites(payload, async () => ({
      conflict: await failure(moveItems(payload, { items: [pageRef(page.id)], toFolder: news.id })),
      cycle: await failure(moveItems(payload, { items: [folderRef(top.id)], toFolder: child.id })),
      stale: await failure(
        moveItems(payload, {
          items: [{ ...pageRef(page.id), expected: { orderKey: "not-the-key", parentId: top.id } }],
          toFolder: news.id,
        })
      ),
    }));

    expect(result.cycle).toBeInstanceOf(MoveBlockedError);
    for (const error of [result.cycle, result.conflict, result.stale]) {
      expect(error.name).toBe("MoveBlockedError");
    }
    expect(result.cycle.status).toBe(400);
    expect(result.cycle.message).toBe(
      "A folder cannot be moved into itself or one of its subfolders"
    );
    expect(result.conflict.status).toBe(409);
    expect(result.conflict.blocked[0]).toMatchObject({
      item: pageRef(page.id),
      locale: "en",
      reason: "conflict",
    });
    expect(result.stale.status).toBe(409);
    expect(result.stale.message).toBe("This part of the tree changed. Reload and try again.");
    expect(writes).toEqual([]);
    expect(recorded).toEqual([]);
    expect(isTreeLockHeld(payload)).toBe(false);
    expect((await readMainRow(payload, page.id)).folder).toBeNull();
  });

  it("re-plans under the lock, so a second move from a stale view is refused", async () => {
    const { payload } = harness;
    const one = await createFolder(payload, { slug: "one" });
    const two = await createFolder(payload, { slug: "two" });
    const page = await createPage(payload, { slug: "page" });
    const before = await readMainRow(payload, page.id);
    const seen = { orderKey: before.orderKey, parentId: before.folder };

    await moveItems(payload, {
      items: [{ ...pageRef(page.id), expected: seen }],
      toFolder: one.id,
    });
    await expect(
      moveItems(payload, { items: [{ ...pageRef(page.id), expected: seen }], toFolder: two.id })
    ).rejects.toMatchObject({ status: 409 });

    expect((await readMainRow(payload, page.id)).folder).toBe(one.id);
  });

  it("patches only the structure columns of the latest version and creates no locale row", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "docs" });
    const page = await createPublishedPage(payload, {
      folder: null,
      slug: "guide",
      title: "Guide",
    });
    await payload.update({
      collection: "pages",
      data: { title: "Anleitung (Entwurf)" } as never,
      depth: 0,
      draft: true,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });
    const versionsBefore = await payload.countVersions({
      collection: "pages",
      overrideAccess: true,
    });
    const readRowLocales = async () => {
      const row = (await payload.db.findOne({
        collection: "pages",
        locale: "all",
        where: { id: { equals: page.id } },
      })) as unknown as { slug: Record<string, string>; title: Record<string, string> };

      return { slug: Object.keys(row.slug).sort(), title: Object.keys(row.title).sort() };
    };
    const localesBefore = await readRowLocales();
    expect(localesBefore).toEqual({ slug: ["en"], title: ["en"] });

    await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });

    const latest = await readLatestVersion(payload, page.id);
    expect(latest.version.folder).toBe(target.id);
    expect(latest.version.title).toMatchObject({ de: "Anleitung (Entwurf)", en: "Guide" });
    // No version entry was created, and the page has the locale rows it had.
    expect(await payload.countVersions({ collection: "pages", overrideAccess: true })).toEqual(
      versionsBefore
    );
    expect(await readRowLocales()).toEqual(localesBefore);
  });

  it("rebalances neighbours that cannot take the insert, a post among them", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "docs" });
    const first = await createPage(payload, { folder: target.id, slug: "first" });
    const post = await payload.create({
      collection: "posts",
      data: { folder: target.id, slug: "second", title: "Second" },
      depth: 0,
      overrideAccess: true,
    });
    // Equal keys leave no gap between them; the post is written by the rebalance.
    await payload.db.updateOne({
      collection: "pages",
      data: { orderKey: "a0" },
      id: first.id,
      returning: false,
    });
    await payload.db.updateOne({
      collection: "posts",
      data: { orderKey: "a0" },
      id: post.id,
      returning: false,
    });
    const loose = await createPage(payload, { slug: "loose" });

    const result = await moveItems(payload, {
      after: pageRef(first.id),
      items: [pageRef(loose.id)],
    });

    const firstKey = (await readMainRow(payload, first.id)).orderKey as string;
    const postKey = (
      (await payload.findByID({
        collection: "posts",
        depth: 0,
        id: post.id,
        overrideAccess: true,
      })) as unknown as { orderKey: string; structureRevision: number }
    ).orderKey;
    const looseKey = result.orderKeys[`pages:${loose.id}`];
    expect(firstKey < looseKey).toBe(true);
    expect(looseKey < postKey).toBe(true);
  });

  it("a folder moved under a type lock takes the locked types, and loses them when it leaves", async () => {
    const { payload } = harness;
    const locker = await createFolder(payload, { slug: "locked" });
    await payload.update({
      collection: "folders",
      data: { allowedTypes: ["posts"], lockSubfolderTypes: true },
      id: locker.id,
      overrideAccess: true,
    });
    const nested = await createFolder(payload, { parent: locker.id, slug: "nested" });
    const outer = await createFolder(payload, { slug: "outer" });
    const inner = await createFolder(payload, { parent: outer.id, slug: "inner" });

    await moveItems(payload, { items: [folderRef(outer.id)], toFolder: nested.id });

    for (const id of [outer.id, inner.id]) {
      expect(await readFolderRow(payload, id)).toMatchObject({
        allowedTypes: ["posts"],
        lockSubfolderTypes: false,
        typesLockedBy: locker.id,
      });
    }

    await moveItems(payload, { items: [folderRef(outer.id)], toFolder: null });

    for (const id of [outer.id, inner.id]) {
      expect(await readFolderRow(payload, id)).toMatchObject({
        allowedTypes: ["posts"],
        typesLockedBy: null,
      });
    }
    expect((await readFolderRow(payload, nested.id)).typesLockedBy).toBe(locker.id);
  });

  it("moves posts and pages of different collections into one folder in the given order", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "mixed" });
    const post = await payload.create({
      collection: "posts",
      data: { slug: "a-post", title: "A post" },
      depth: 0,
      overrideAccess: true,
    });
    const page = await createPage(payload, { slug: "a-page" });

    const result = await moveItems(payload, {
      items: [postRef(post.id), pageRef(page.id)],
      toFolder: target.id,
    });

    expect(result.moved).toEqual([postRef(post.id), pageRef(page.id)]);
    expect(await readFullPath(payload, "posts", post.id)).toBe("/mixed/a-post");
    expect(result.orderKeys[`posts:${post.id}`] < result.orderKeys[`pages:${page.id}`]).toBe(true);
  });

  it("leaves the caller's request as it found it", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "docs" });
    const page = await createPage(payload, { slug: "page" });
    const req = await createTestRequest(payload);
    req.locale = "de";
    req.context = { marker: "caller" };

    await moveItems(payload, { items: [pageRef(page.id)], req, toFolder: target.id });

    expect(req.locale).toBe("de");
    expect(req.context).toEqual({ marker: "caller" });
    expect(req.transactionID).toBeUndefined();
  });

  it("serialises parallel moves into one folder, each with its own key", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "docs" });
    const pages = await Promise.all(
      Array.from({ length: 5 }, (_, index) => createPage(payload, { slug: `page-${index}` }))
    );

    await Promise.all(
      pages.map((page) => moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id }))
    );

    const keys = await Promise.all(
      pages.map(async (page) => (await readMainRow(payload, page.id)).orderKey)
    );
    expect(new Set(keys).size).toBe(5);
    expect((await listPagesIn(payload, target.id)).sort()).toEqual(
      pages.map((page) => page.id).sort()
    );
    for (const page of pages) {
      expect((await readMainRow(payload, page.id)).folder).toBe(target.id);
    }
  });

  it("a page and a folder with a legacy segment move back to the site root, a dotted one does not", async () => {
    const { payload } = harness;
    const home = await createFolder(payload, { slug: "legacy-home" });
    const legacyFolder = await createFolder(payload, { parent: home.id, slug: "legacy-folder" });
    const legacyPost = (await payload.create({
      collection: "posts",
      data: { folder: home.id, slug: "legacy-post", title: "Legacy post" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const dottedPost = (await payload.create({
      collection: "posts",
      data: { folder: home.id, slug: "dotted-post", title: "Dotted post" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    // Segments written before the plugin existed (spec section 2.6 accepts them until edited): they
    // fail the segment pattern, so no save can produce them, only a write at database level.
    await payload.db.updateOne({
      collection: "posts",
      data: { pathSegment: "About", slug: "About" },
      id: legacyPost.id,
      returning: false,
    });
    await payload.db.updateOne({
      collection: "posts",
      data: { pathSegment: "Feed.XML", slug: "Feed.XML" },
      id: dottedPost.id,
      returning: false,
    });
    await payload.db.updateOne({
      collection: "folders",
      data: { slug: { de: "Legacy_Folder", en: "Legacy_Folder" } },
      id: legacyFolder.id,
      returning: false,
    });

    const refused = await moveItems(payload, {
      items: [postRef(dottedPost.id)],
      toFolder: null,
    }).catch((error: unknown) => error as MoveBlockedError);
    expect(refused).toBeInstanceOf(MoveBlockedError);
    expect((refused as MoveBlockedError).blocked).toEqual([
      {
        item: postRef(dottedPost.id),
        message: "/Feed.XML cannot be at the top level: a top-level segment cannot contain a dot",
        reason: "reserved",
      },
    ]);

    const result = await moveItems(payload, {
      items: [postRef(legacyPost.id), folderRef(legacyFolder.id)],
      toFolder: null,
    });

    expect(result.moved).toEqual([postRef(legacyPost.id), folderRef(legacyFolder.id)]);
    expect(await readFullPath(payload, "posts", legacyPost.id)).toBe("/About");
    // A stored folder path is always lowercased, so only the segment's validity changed hands here.
    expect((await readFolderRow(payload, legacyFolder.id)).fullPath.en).toBe("/legacy_folder");
    expect((await readFolderRow(payload, legacyFolder.id)).parent).toBeNull();
    // The dotted post stayed where it was.
    expect(await readFullPath(payload, "posts", dottedPost.id)).toBe("/legacy-home/Feed.XML");
  });

  it("moves a folder and its pages in an app without localization", async () => {
    const plain = await getTestPayload({ localized: false });
    try {
      const { payload } = plain;
      const target = await createFolder(payload, { slug: "company" });
      const team = await createFolder(payload, { slug: "team" });
      const members = await createFolder(payload, { parent: team.id, slug: "members" });
      const page = await createPublishedPage(payload, {
        folder: members.id,
        slug: "roster",
        title: "Roster",
      });
      const loose = await createPublishedPage(payload, {
        folder: null,
        slug: "hello",
        title: "Hello",
      });

      const result = await moveItems(payload, {
        items: [folderRef(team.id), pageRef(loose.id)],
        toFolder: target.id,
      });

      const membersRow = (await payload.db.findOne({
        collection: "folders",
        where: { id: { equals: members.id } },
      })) as unknown as { ancestorIds: string; fullPath: string };
      expect(membersRow).toMatchObject({
        ancestorIds: `/${target.id}/${team.id}/`,
        fullPath: "/company/team/members",
      });
      expect(await readFullPath(payload, "pages", page.id)).toBe("/company/team/members/roster");
      expect(await readFullPath(payload, "pages", loose.id)).toBe("/company/hello");
      expect(result.changes.every((change) => change.locale === null)).toBe(true);
      expect(result.changes).toHaveLength(4);
    } finally {
      await plain.destroy();
    }
  });

  it("moves a page of a collection with versions but no drafts", () =>
    withNotesApp(async (payload) => {
      const target = await createFolder(payload, { slug: "docs" });
      const note = (await payload.create({
        collection: "notes" as never,
        data: { slug: "memo", title: "Memo" } as never,
        depth: 0,
        overrideAccess: true,
      })) as unknown as { id: number };

      const result = await moveItems(payload, {
        items: [{ collection: "notes", id: note.id }],
        toFolder: target.id,
      });

      const moved = (await payload.db.findOne({
        collection: "notes" as never,
        where: { id: { equals: note.id } },
      })) as unknown as PageStructure;
      expect(moved).toMatchObject({ folder: target.id, structureRevision: 1 });
      expect(moved.orderKey).toBe(result.orderKeys[`notes:${note.id}`]);
      // One change per locale: the segment is shared, so both read the same path.
      expect(result.changes).toHaveLength(2);
      for (const change of result.changes) {
        expect(change).toMatchObject({ collection: "notes", from: "/memo", to: "/docs/memo" });
      }
    }));

  it("rebalances equal keys in a collection with versions but no drafts", () =>
    withNotesApp(async (payload) => {
      const target = await createFolder(payload, { slug: "docs" });
      const [first, second] = await Promise.all(
        ["first", "second"].map(
          (slug) =>
            payload.create({
              collection: "notes" as never,
              data: { folder: target.id, slug, title: slug } as never,
              depth: 0,
              overrideAccess: true,
            }) as unknown as Promise<{ id: number }>
        )
      );
      // Equal keys leave no gap, so the insert rewrites both neighbours' keys first.
      for (const note of [first, second]) {
        await payload.db.updateOne({
          collection: "notes" as never,
          data: { orderKey: "a0" },
          id: note.id,
          returning: false,
        });
      }
      const loose = (await payload.create({
        collection: "notes" as never,
        data: { slug: "loose", title: "Loose" } as never,
        depth: 0,
        overrideAccess: true,
      })) as unknown as { id: number };

      const result = await moveItems(payload, {
        after: { collection: "notes", id: first.id },
        items: [{ collection: "notes", id: loose.id }],
      });

      const keyOf = async (id: number) =>
        (
          (await payload.db.findOne({
            collection: "notes" as never,
            where: { id: { equals: id } },
          })) as unknown as { orderKey: string }
        ).orderKey;
      const keys = [
        await keyOf(first.id),
        result.orderKeys[`notes:${loose.id}`],
        await keyOf(second.id),
      ];
      expect(new Set(keys).size).toBe(3);
      expect([...keys].sort()).toEqual(keys);
    }));

  it.skipIf(process.env.TEST_DB === "postgres")(
    "calls afterPathChange when the adapter runs without transactions",
    async () => {
      const unbound = await getTestPayload({
        foldersOptions: {
          hooks: {
            afterPathChange: ({ changes, reason }) => {
              recorded.push({ changes, reason });
            },
          },
        },
        sqliteTransactions: false,
      });
      try {
        const { payload } = unbound;
        const target = await createFolder(payload, { slug: "docs" });
        const page = await createPage(payload, { slug: "page" });

        await moveItems(payload, { items: [pageRef(page.id)], toFolder: target.id });

        expect(recorded).toHaveLength(1);
        expect(recorded[0].reason).toBe("move");
        expect(isTreeLockHeld(payload)).toBe(false);
      } finally {
        await unbound.destroy();
      }
    }
  );
});
