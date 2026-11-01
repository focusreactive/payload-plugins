import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { isTreeLockHeld, readRevision } from "../../src/core/treeLock.js";
import { repairTree } from "../../src/core/repair.js";
import type { RepairResult } from "../../src/core/repair.js";
import { verifyTree } from "../../src/core/verify.js";
import type { VerifyResult } from "../../src/core/verify.js";
import type { PathChange, PathChangeReason } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { countDbCalls } from "../helpers/countDbCalls.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";

type HookCall = { changes: PathChange[]; reason: PathChangeReason };

let harness: TestPayload;
const hookCalls: HookCall[] = [];

beforeAll(async () => {
  harness = await getTestPayload({
    foldersOptions: {
      hooks: {
        afterPathChange: ({ changes, reason }) => {
          hookCalls.push({ changes, reason });
        },
      },
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  hookCalls.length = 0;
  const { payload } = harness;
  for (const collection of ["pages", "posts"] as const) {
    await payload.db.deleteMany({ collection, where: { id: { exists: true } } });
  }
  await payload.db.deleteVersions({ collection: "pages", where: { id: { exists: true } } });
  await payload.db.deleteMany({ collection: "folders", where: { id: { exists: true } } });
  await payload.db.deleteMany({
    collection: "folder-redirects" as never,
    where: { id: { exists: true } },
  });
});

type Row = Record<string, unknown> & { id: number };

const readRow = async (collection: "folders" | "pages" | "posts", id: number): Promise<Row> =>
  (await harness.payload.db.findOne({
    collection,
    locale: "all",
    where: { id: { equals: id } },
  })) as unknown as Row;

/**
 * Writes a folder row the way a script outside the plugin would: at database level, the whole row
 * with `patch` applied, because the adapter deletes the locale rows a write leaves out.
 */
const rewriteFolderRow = async (id: number, patch: Record<string, unknown>): Promise<void> => {
  const { id: _id, createdAt: _createdAt, ...stored } = await readRow("folders", id);
  await harness.payload.db.updateOne({
    collection: "folders",
    data: { ...stored, ...patch },
    id,
    returning: false,
  });
};

const kindsOf = (result: VerifyResult | RepairResult["fixed"]): string[] =>
  [...new Set(result.issues.map((issue) => issue.kind))].sort();

const issuesOfKind = <TKind extends VerifyResult["issues"][number]["kind"]>(
  result: VerifyResult | RepairResult["fixed"] | RepairResult["conflicts"],
  kind: TKind
) =>
  result.issues.filter((issue) => issue.kind === kind) as Array<
    Extract<VerifyResult["issues"][number], { kind: TKind }>
  >;

/** A page as it was stored before the plugin: no order key, no path segment, no structure. */
const createLegacyPage = async ({
  createdAt,
  extra = {},
  folder = null,
  slug,
  status = "published",
  title = slug,
}: {
  createdAt: string;
  extra?: Record<string, unknown>;
  folder?: number | null;
  slug: Record<string, string> | string;
  status?: "draft" | "published";
  title?: Record<string, string> | string;
}): Promise<Row> =>
  (await harness.payload.db.create({
    collection: "pages",
    data: {
      _status: { en: status },
      createdAt,
      folder,
      slug: typeof slug === "string" ? { en: slug } : slug,
      title: typeof title === "string" ? { en: title } : title,
      updatedAt: createdAt,
      ...extra,
    },
  })) as unknown as Row;

/** A post that follows every rule of the tree, written at database level so a test can bend one. */
const createPost = async ({
  createdAt = "2026-01-01T00:00:00.000Z",
  folder = null,
  isFolderRoot = false,
  orderKey,
  pathSegment,
  slug,
}: {
  createdAt?: string;
  folder?: number | null;
  isFolderRoot?: boolean;
  orderKey: string | null;
  pathSegment?: string | null;
  slug: string;
}): Promise<Row> =>
  (await harness.payload.db.create({
    collection: "posts",
    data: {
      createdAt,
      folder,
      isFolderRoot,
      orderKey,
      pathSegment: pathSegment === undefined ? slug : pathSegment,
      slug,
      structureRevision: 0,
      title: slug,
      updatedAt: createdAt,
    },
  })) as unknown as Row;

const createdAtOf = (index: number): string =>
  new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString();

const untouched = (row: Row) => ({
  ...row,
  orderKey: undefined,
  pathSegment: undefined,
  structureRevision: undefined,
  updatedAt: undefined,
});

const readRedirects = async () =>
  (
    (await harness.payload.db.find({
      collection: "folder-redirects" as never,
      pagination: false,
      sort: "id",
    })) as unknown as {
      docs: Array<{ fromPath: string; kind: string; locale: string | null; target: unknown }>;
    }
  ).docs;

describe("verify and repair", () => {
  it("a tree that follows the rules verifies clean and repairs nothing", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { name: "Docs", slug: "docs" });
    const guide = await createFolder(payload, { parent: docs.id, slug: "guide" });
    await createPage(payload, { folder: guide.id, slug: "start" });
    await createPage(payload, { folder: null, slug: "home" });

    const verified = await verifyTree(payload);
    const repaired = await repairTree(payload);

    expect(verified).toMatchObject({ conflicts: 0, fixable: 0, ok: true, quick: false });
    expect(verified.issues).toEqual([]);
    expect(repaired.fixed.total).toBe(0);
    expect(repaired.conflicts.total).toBe(0);
    expect(repaired.writes).toEqual({
      folders: 0,
      orderKeys: 0,
      pages: 0,
      redirectsDeleted: 0,
      redirectsWritten: 0,
      versions: 0,
    });
    expect(repaired.revision).toBeNull();
    expect(hookCalls).toEqual([]);
  });

  it("verify finds a folder path written behind the plugin's back", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { name: "Docs", slug: "docs" });
    const guide = await createFolder(payload, { parent: docs.id, slug: "guide" });
    await rewriteFolderRow(guide.id, {
      ancestorIds: "/",
      depth: 1,
      fullPath: { de: "/guide", en: "/elsewhere/guide" },
    });

    const result = await verifyTree(payload);

    expect(result).toMatchObject({ conflicts: 0, fixable: 1, ok: false });
    expect(result.counts.folderPath).toBe(1);
    const [issue] = issuesOfKind(result, "folderPath");
    expect(issue).toMatchObject({
      ancestorIds: { expected: `/${docs.id}/`, stored: "/" },
      depth: { expected: 2, stored: 1 },
      fixable: true,
      item: { collection: "folders", id: guide.id },
      path: "/docs/guide",
    });
    expect(issue.fullPath).toEqual([
      { expected: "/docs/guide", locale: "en", stored: "/elsewhere/guide" },
      { expected: "/docs/guide", locale: "de", stored: "/guide" },
    ]);
    // The same drift is what the tree view's banner reads, from the folder rows alone.
    expect(kindsOf(await verifyTree(payload, { quick: true }))).toEqual(["folderPath"]);
  });

  it("repair recomputes it", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { name: "Docs", slug: "docs" });
    const guide = await createFolder(payload, { parent: docs.id, slug: "guide" });
    const deeper = await createFolder(payload, { parent: guide.id, slug: "deeper" });
    // A post has no drafts, so it is live and the folder's old URL is worth a redirect.
    const page = (await payload.create({
      collection: "posts",
      data: { folder: guide.id, slug: "start", title: "Start" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    await rewriteFolderRow(guide.id, {
      ancestorIds: "/",
      depth: 1,
      fullPath: { de: "/guide", en: "/elsewhere/guide" },
    });
    const revisionBefore = await readRevision(await createTestRequest(payload));

    const dryRun = await repairTree(payload, { dryRun: true });

    expect(dryRun).toMatchObject({ dryRun: true, revision: null });
    expect(dryRun.fixed.counts.folderPath).toBe(1);
    expect(dryRun.writes.folders).toBe(1);
    expect(dryRun.changes.total).toBeGreaterThan(0);
    expect((await readRow("folders", guide.id)).fullPath).toEqual({
      de: "/guide",
      en: "/elsewhere/guide",
    });
    expect(hookCalls).toEqual([]);

    const result = await repairTree(payload);

    expect(result.dryRun).toBe(false);
    expect(result.fixed.counts.folderPath).toBe(1);
    expect(result.conflicts.total).toBe(0);
    expect(result.revision).toBeGreaterThan(revisionBefore);
    expect(await readRow("folders", guide.id)).toMatchObject({
      ancestorIds: `/${docs.id}/`,
      depth: 2,
      fullPath: { de: "/docs/guide", en: "/docs/guide" },
      name: { en: guide.name },
    });
    expect((await readRow("folders", deeper.id)).fullPath).toEqual({
      de: "/docs/guide/deeper",
      en: "/docs/guide/deeper",
    });
    const read = (await payload.findByID({
      collection: "posts",
      depth: 0,
      id: page.id,
      overrideAccess: true,
    })) as unknown as { fullPath: string };
    expect(read.fullPath).toBe("/docs/guide/start");

    // The host hears every URL that changed, with the reason repair.
    expect(hookCalls).toHaveLength(1);
    expect(hookCalls[0].reason).toBe("repair");
    expect(hookCalls[0].changes).toEqual(
      expect.arrayContaining([
        {
          collection: "folders",
          from: "/elsewhere/guide",
          id: guide.id,
          kind: "folder",
          locale: "en",
          published: true,
          to: "/docs/guide",
        },
        {
          collection: "posts",
          from: "/elsewhere/guide/start",
          id: page.id,
          kind: "page",
          locale: "en",
          published: true,
          to: "/docs/guide/start",
        },
      ])
    );
    // The old URL of the folder redirects, like any move.
    expect(await readRedirects()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromPath: "/elsewhere/guide", kind: "folderPrefix" }),
      ])
    );

    // Nothing is left to find, and a second repair writes nothing.
    expect(await verifyTree(payload)).toMatchObject({ ok: true });
    hookCalls.length = 0;
    expect((await repairTree(payload)).writes.folders).toBe(0);
    expect(hookCalls).toEqual([]);
  });
});

describe("installing on existing content", () => {
  it("installing the plugin on 50 legacy pages then repairing gives keys in createdAt order", async () => {
    const { payload } = harness;
    const modern = await createPage(payload, { folder: null, slug: "modern" });
    const count = 50;
    // Created out of order, so the id order is not the creation order.
    for (let step = 0; step < count; step += 1) {
      const index = (step * 17) % count;
      await createLegacyPage({ createdAt: createdAtOf(index), slug: `legacy-${index}` });
    }

    const verified = await verifyTree(payload);

    const [missing] = issuesOfKind(verified, "orderKeyMissing");
    expect(missing).toMatchObject({ count: count, fixable: true, parent: null });
    expect(verified.counts.pageSegment).toBe(count);
    expect(verified.conflicts).toBe(0);

    const result = await repairTree(payload);

    expect(result.conflicts.total).toBe(0);
    expect(result.writes).toMatchObject({ orderKeys: count, pages: count });
    const { docs } = await payload.db.find({ collection: "pages", pagination: false });
    const slugsByKey = (
      docs as unknown as Array<{ orderKey: string; slug: { en?: string } | string }>
    )
      .map((doc) => ({
        key: doc.orderKey,
        slug: typeof doc.slug === "string" ? doc.slug : doc.slug.en,
      }))
      .sort((left, right) => (left.key < right.key ? -1 : 1))
      .map((entry) => entry.slug);
    // The keyed page keeps the top, the legacy pages follow in the order they were created.
    expect(slugsByKey).toEqual([
      "modern",
      ...Array.from({ length: count }, (_, index) => `legacy-${index}`),
    ]);
    expect((await readRow("pages", modern.id)).orderKey).toBe(modern.orderKey);
    expect(new Set(docs.map((doc) => (doc as unknown as { orderKey: string }).orderKey)).size).toBe(
      count + 1
    );
    expect(await verifyTree(payload)).toMatchObject({ ok: true });
  });

  it("repair backfills pathSegment for legacy pages without touching their other fields", async () => {
    const { payload } = harness;
    const legacy = await createLegacyPage({
      createdAt: "2025-03-01T00:00:00.000Z",
      extra: {
        blocks: [{ blockType: "hero", heading: { de: "Hallo", en: "Hello" }, id: "legacy-hero" }],
      },
      slug: { de: "ueber-uns", en: "about-us" },
      title: { de: "Ueber uns", en: "About us" },
    });
    const before = await readRow("pages", legacy.id);
    expect(before.pathSegment).toEqual({ de: null, en: null });

    const verified = await verifyTree(payload);
    const [segmentIssue] = issuesOfKind(verified, "pageSegment");
    expect(segmentIssue.item).toEqual({ collection: "pages", id: legacy.id });
    expect(segmentIssue.segments).toHaveLength(2);
    expect(segmentIssue.segments).toEqual(
      expect.arrayContaining([
        { expected: "about-us", locale: "en", stored: null },
        { expected: "ueber-uns", locale: "de", stored: null },
      ])
    );
    // The page has no URL until it has a segment, and the host hears about the first one.
    await repairTree(payload);

    const after = await readRow("pages", legacy.id);
    expect(after.pathSegment).toEqual({ de: "ueber-uns", en: "about-us" });
    // Every other column, locale and block row is what it was (the adapter stamps `updatedAt`).
    expect(untouched(after)).toEqual(untouched(before));
    expect(after.blocks).toEqual(before.blocks);
    expect(after.title).toEqual({ de: "Ueber uns", en: "About us" });
    expect(hookCalls[0].changes).toEqual(
      expect.arrayContaining([
        {
          collection: "pages",
          from: null,
          id: legacy.id,
          kind: "page",
          locale: "de",
          published: false,
          to: "/ueber-uns",
        },
      ])
    );
  });
});

describe("conflicts", () => {
  it("repair lists two root-level pages sharing a segment without changing them", async () => {
    const { payload } = harness;
    const page = await createLegacyPage({
      createdAt: "2025-01-01T00:00:00.000Z",
      extra: { orderKey: "a0", pathSegment: { en: "contact" }, structureRevision: 0 },
      slug: "contact",
    });
    const post = await createPost({ orderKey: "a1", slug: "contact" });
    const before = { page: await readRow("pages", page.id), post: await readRow("posts", post.id) };

    const result = await repairTree(payload);

    expect(result.fixed.total).toBe(0);
    expect(result.writes).toEqual({
      folders: 0,
      orderKeys: 0,
      pages: 0,
      redirectsDeleted: 0,
      redirectsWritten: 0,
      versions: 0,
    });
    expect(result.revision).toBeNull();
    const duplicates = issuesOfKind(result.conflicts, "duplicatePath");
    expect(duplicates.find((duplicate) => duplicate.locale === "en")).toMatchObject({
      count: 2,
      fixable: false,
      items: [
        { collection: "pages", id: page.id },
        { collection: "posts", id: post.id },
      ],
      path: "/contact",
    });
    expect({
      page: await readRow("pages", page.id),
      post: await readRow("posts", post.id),
    }).toEqual(before);
  });

  it("two draft pages may share a segment, and a draft does not clash with a live page", async () => {
    const { payload } = harness;
    await createLegacyPage({
      createdAt: "2025-01-01T00:00:00.000Z",
      extra: { orderKey: "a0", pathSegment: { en: "news" }, structureRevision: 0 },
      slug: "news",
      status: "draft",
    });
    await createLegacyPage({
      createdAt: "2025-01-02T00:00:00.000Z",
      extra: { orderKey: "a1", pathSegment: { en: "news" }, structureRevision: 0 },
      slug: "news",
      status: "draft",
    });
    await createPost({ orderKey: "a2", slug: "news" });

    expect(await verifyTree(payload)).toMatchObject({ ok: true });
  });

  it("two root pages in one folder are listed, and so is a page with a folder's segment", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const first = await createPost({
      folder: docs.id,
      isFolderRoot: true,
      orderKey: "a0",
      slug: "one",
    });
    const second = await createPost({
      folder: docs.id,
      isFolderRoot: true,
      orderKey: "a1",
      slug: "two",
    });
    await createFolder(payload, { slug: "shared" });
    const clash = await createPost({ orderKey: "a1", slug: "shared" });

    const result = await repairTree(payload);

    expect(issuesOfKind(result.conflicts, "multipleRootPages")).toEqual([
      expect.objectContaining({
        count: 2,
        folder: docs.id,
        items: [
          { collection: "posts", id: first.id },
          { collection: "posts", id: second.id },
        ],
      }),
    ]);
    expect(
      issuesOfKind(result.conflicts, "duplicatePath").find((issue) => issue.locale === "en")
    ).toMatchObject({ path: "/shared" });
    expect((await readRow("posts", clash.id)).slug).toBe("shared");
    expect(result.fixed.total).toBe(0);
  });

  it("verify reports an invalid legacy segment", async () => {
    const { payload } = harness;
    const about = await createPost({ orderKey: "a0", slug: "About" });
    const spaced = await createPost({ orderKey: "a1", slug: "Hello World" });
    const upper = await createPost({ orderKey: "a2", slug: "Team" });
    const lower = await createPost({ orderKey: "a3", slug: "team" });

    const verified = await verifyTree(payload);

    const byItem = new Map(
      issuesOfKind(verified, "invalidSegment").map((issue) => [issue.item.id, issue])
    );
    // Capitals only: repair can save the lowercase form.
    expect(byItem.get(about.id)).toMatchObject({
      fixable: true,
      fixedSegment: "about",
      locale: null,
      segment: "About",
    });
    // No lowercase form is valid, or another page has it already: a person decides.
    expect(byItem.get(spaced.id)).toMatchObject({ fixable: false, fixedSegment: null });
    expect(byItem.get(upper.id)).toMatchObject({ fixable: false, fixedSegment: null });
    expect(byItem.has(lower.id)).toBe(false);
    expect(verified.counts.duplicatePath).toBeGreaterThan(0);
  });

  it("repair lowercases a legacy segment with a redirect from its old URL and leaves the rest", async () => {
    const { payload } = harness;
    const about = await createPost({ orderKey: "a0", slug: "About" });
    const spaced = await createPost({ orderKey: "a1", slug: "Hello World" });
    const upper = await createPost({ orderKey: "a2", slug: "Team" });
    await createPost({ orderKey: "a3", slug: "team" });

    const result = await repairTree(payload);

    expect(result.fixed.counts.invalidSegment).toBe(1);
    expect(result.conflicts.counts.invalidSegment).toBe(2);
    expect(await readRow("posts", about.id)).toMatchObject({ pathSegment: "about", slug: "about" });
    expect((await readRow("posts", spaced.id)).slug).toBe("Hello World");
    expect((await readRow("posts", upper.id)).slug).toBe("Team");
    expect(await readRedirects()).toEqual([
      expect.objectContaining({ fromPath: "/About", kind: "page", locale: "en" }),
      expect.objectContaining({ fromPath: "/About", kind: "page", locale: "de" }),
    ]);
    expect(hookCalls[0].changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "/About", id: about.id, locale: "en", to: "/about" }),
      ])
    );
    // What is left is the conflicts, which a second repair also leaves alone.
    const again = await repairTree(payload);
    expect(again.fixed.total).toBe(0);
    expect(again.writes.pages).toBe(0);
  });
});

describe("versions, cycles and folder rows", () => {
  it("repair copies main-row structure into a drifted latest version", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const other = await createFolder(payload, { slug: "other" });
    const page = await createPage(payload, { folder: docs.id, slug: "guide" });
    const main = await readRow("pages", page.id);
    const { docs: versions } = (await payload.db.findVersions({
      collection: "pages",
      pagination: false,
      where: { and: [{ parent: { equals: page.id } }, { latest: { equals: true } }] },
    })) as unknown as { docs: Array<{ id: number }> };
    await payload.db.updateVersion({
      collection: "pages",
      id: versions[0].id,
      returning: false,
      versionData: { version: { folder: other.id, orderKey: "zz", structureRevision: 9 } },
    } as never);

    const verified = await verifyTree(payload);

    expect(issuesOfKind(verified, "staleVersion")).toEqual([
      expect.objectContaining({
        fields: ["folder", "orderKey", "structureRevision"],
        fixable: true,
        item: { collection: "pages", id: page.id },
      }),
    ]);
    expect(verified.conflicts).toBe(0);

    const result = await repairTree(payload);

    expect(result.writes.versions).toBe(1);
    const readLatest = async () =>
      (
        (await payload.db.findVersions({
          collection: "pages",
          pagination: false,
          where: { and: [{ parent: { equals: page.id } }, { latest: { equals: true } }] },
        })) as unknown as {
          docs: Array<{ version: { folder: number; orderKey: string; structureRevision: number } }>;
        }
      ).docs[0].version;
    expect(await readLatest()).toMatchObject({
      folder: docs.id,
      orderKey: main.orderKey,
      structureRevision: main.structureRevision,
    });
    // The page itself is not touched.
    expect(await readRow("pages", page.id)).toEqual(main);
    expect(await verifyTree(payload)).toMatchObject({ ok: true });
  });

  it("repair breaks a cycle written directly to the database", async () => {
    const { payload } = harness;
    const first = await createFolder(payload, { slug: "first" });
    const second = await createFolder(payload, { parent: first.id, slug: "second" });
    const third = await createFolder(payload, { parent: second.id, slug: "third" });
    // `first` is put under its own grandchild, and its paths follow the way a raw write leaves them.
    await rewriteFolderRow(first.id, {
      ancestorIds: `/${second.id}/${third.id}/`,
      depth: 4,
      fullPath: { de: "/first/second/third/first", en: "/first/second/third/first" },
      parent: third.id,
    });

    const verified = await verifyTree(payload);

    expect(issuesOfKind(verified, "folderCycle")).toEqual([
      expect.objectContaining({
        fixable: true,
        folders: [first.id, second.id, third.id],
        item: { collection: "folders", id: first.id },
      }),
    ]);
    expect(kindsOf(await verifyTree(payload, { quick: true }))).toEqual(
      expect.arrayContaining(["folderCycle"])
    );

    const result = await repairTree(payload);

    expect(result.fixed.counts.folderCycle).toBe(1);
    expect(await readRow("folders", first.id)).toMatchObject({
      ancestorIds: "/",
      depth: 1,
      fullPath: { de: "/first", en: "/first" },
      parent: null,
    });
    expect((await readRow("folders", third.id)).fullPath).toEqual({
      de: "/first/second/third",
      en: "/first/second/third",
    });
    expect(await verifyTree(payload)).toMatchObject({ ok: true });
  });

  // Postgres refuses a parent that does not exist. SQLite can hold one when foreign keys were off
  // while the row was written, as they are in a database copied in by a script.
  it.skipIf(process.env.TEST_DB === "postgres")(
    "repair moves a folder whose parent is gone to the top level",
    async () => {
      const { payload } = harness;
      const docs = await createFolder(payload, { slug: "docs" });
      const orphan = await createFolder(payload, { parent: docs.id, slug: "orphan" });
      const { client } = payload.db as unknown as {
        client: { execute: (statement: string) => Promise<unknown> };
      };
      await client.execute("PRAGMA foreign_keys = OFF");
      try {
        await rewriteFolderRow(orphan.id, { parent: 987_654 });
      } finally {
        await client.execute("PRAGMA foreign_keys = ON");
      }

      const verified = await verifyTree(payload);

      expect(issuesOfKind(verified, "folderParentMissing")).toEqual([
        expect.objectContaining({
          fixable: true,
          item: { collection: "folders", id: orphan.id },
          parent: 987_654,
        }),
      ]);

      await repairTree(payload);

      expect(await readRow("folders", orphan.id)).toMatchObject({
        ancestorIds: "/",
        depth: 1,
        fullPath: { de: "/orphan", en: "/orphan" },
        parent: null,
      });
      expect(await verifyTree(payload)).toMatchObject({ ok: true });
    }
  );

  it("repair writes the path row a locale is missing", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await rewriteFolderRow(docs.id, { fullPath: { en: "/docs" } });

    const verified = await verifyTree(payload);
    const quick = await verifyTree(payload, { quick: true });

    for (const found of [verified, quick]) {
      expect(issuesOfKind(found, "folderPath")[0].fullPath).toEqual([
        { expected: "/docs", locale: "de", stored: null },
      ]);
    }

    const result = await repairTree(payload);

    expect((await readRow("folders", docs.id)).fullPath).toEqual({ de: "/docs", en: "/docs" });
    expect(result.writes.folders).toBe(1);
    // Every read already returned /docs through the fallback, so no URL changed.
    expect(result.changes.total).toBe(0);
    expect(hookCalls).toEqual([]);
    expect(await verifyTree(payload)).toMatchObject({ ok: true });
  });

  it("repair leaves a folder whose path another folder holds, and lists the clash", async () => {
    const { payload } = harness;
    const alpha = await createFolder(payload, { slug: "alpha" });
    const beta = await createFolder(payload, { slug: "beta" });
    // `beta` now carries `alpha`'s segment while its stored path still says /beta.
    await rewriteFolderRow(beta.id, { slug: { de: "alpha", en: "alpha" } });
    const before = await readRow("folders", beta.id);

    const verified = await verifyTree(payload);
    const result = await repairTree(payload);

    expect(
      issuesOfKind(verified, "duplicatePath").find((issue) => issue.locale === "en")
    ).toMatchObject({
      count: 2,
      path: "/alpha",
    });
    // Writing /alpha twice would break the unique path; the repair holds the folder back instead.
    expect(result.writes.folders).toBe(0);
    expect(issuesOfKind(result.conflicts, "folderPath")).toHaveLength(1);
    expect(issuesOfKind(result.conflicts, "duplicatePath").length).toBeGreaterThan(0);
    expect(await readRow("folders", beta.id)).toEqual(before);
    expect((await readRow("folders", alpha.id)).fullPath).toEqual({ de: "/alpha", en: "/alpha" });
  });

  it("repair puts two folders that swapped paths back", async () => {
    const { payload } = harness;
    const alpha = await createFolder(payload, { slug: "alpha" });
    const beta = await createFolder(payload, { slug: "beta" });
    // A swap cannot be written in one step (a path is unique per locale), so it goes through a
    // third value.
    await rewriteFolderRow(alpha.id, { fullPath: { de: "/parking", en: "/parking" } });
    await rewriteFolderRow(beta.id, { fullPath: { de: "/alpha", en: "/alpha" } });
    await rewriteFolderRow(alpha.id, { fullPath: { de: "/beta", en: "/beta" } });

    const result = await repairTree(payload);

    expect(result.fixed.counts.folderPath).toBe(2);
    expect((await readRow("folders", alpha.id)).fullPath).toEqual({ de: "/alpha", en: "/alpha" });
    expect((await readRow("folders", beta.id)).fullPath).toEqual({ de: "/beta", en: "/beta" });
  });
});

describe("order keys, redirects and the tree lock", () => {
  it("repair rebalances equal keys in the order a read shows them", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const subfolder = await createFolder(payload, { parent: docs.id, slug: "sub" });
    await rewriteFolderRow(subfolder.id, { orderKey: "a0" });
    const first = await createPost({ folder: docs.id, orderKey: "a0", slug: "first" });
    const second = await createPost({ folder: docs.id, orderKey: "a0", slug: "second" });
    const third = await createPost({ folder: docs.id, orderKey: "a1", slug: "third" });

    const verified = await verifyTree(payload);

    expect(issuesOfKind(verified, "orderKeyEqual")).toEqual([
      expect.objectContaining({ count: 3, fixable: true, parent: docs.id }),
    ]);

    await repairTree(payload);

    const keys = {
      first: (await readRow("posts", first.id)).orderKey as string,
      second: (await readRow("posts", second.id)).orderKey as string,
      sub: (await readRow("folders", subfolder.id)).orderKey as string,
      third: (await readRow("posts", third.id)).orderKey as string,
    };
    expect(new Set(Object.values(keys)).size).toBe(4);
    // Ties went by kind (folder first), then collection and id, then the third's own key.
    const order = Object.entries(keys)
      .sort((left, right) => (left[1] < right[1] ? -1 : 1))
      .map(([name]) => name);
    expect(order).toEqual(["sub", "first", "second", "third"]);
    expect(await verifyTree(payload)).toMatchObject({ ok: true });
  });

  it("repair writes no redirect rows when asked not to, and still fixes the paths", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await payload.create({
      collection: "posts",
      data: { folder: docs.id, slug: "start", title: "Start" },
      depth: 0,
      overrideAccess: true,
    });
    await rewriteFolderRow(docs.id, { fullPath: { de: "/wrong", en: "/wrong" } });

    const result = await repairTree(payload, { redirects: false });

    expect(result.writes.redirectsWritten).toBe(0);
    expect(result.writes.folders).toBe(1);
    expect(await readRedirects()).toEqual([]);
    expect((await readRow("folders", docs.id)).fullPath).toEqual({ de: "/docs", en: "/docs" });
    // The host still hears about the URL change.
    expect(hookCalls).toHaveLength(1);
  });

  it("repair deletes redirect rows whose target is gone", async () => {
    const { payload } = harness;
    const kept = await createPost({ orderKey: "a0", slug: "kept" });
    const gone = await createPost({ orderKey: "a1", slug: "gone" });
    const row = (fromPath: string, id: number) =>
      payload.db.create({
        collection: "folder-redirects" as never,
        data: {
          createdAt: new Date().toISOString(),
          fromPath,
          kind: "page",
          locale: "en",
          lookupKey: `en:${fromPath}`,
          target: { relationTo: "posts", value: id },
          updatedAt: new Date().toISOString(),
        },
      });
    await row("/old-kept", kept.id);
    await row("/old-gone", gone.id);
    await payload.db.deleteOne({ collection: "posts", where: { id: { equals: gone.id } } });

    const verified = await verifyTree(payload);

    expect(issuesOfKind(verified, "danglingRedirect")).toEqual([
      expect.objectContaining({ fixable: true, fromPath: "/old-gone", locale: "en" }),
    ]);

    const result = await repairTree(payload);

    expect(result.writes.redirectsDeleted).toBe(1);
    expect((await readRedirects()).map((redirect) => redirect.fromPath)).toEqual(["/old-kept"]);
  });

  it("two tree-state rows are reported and left alone", async () => {
    const second = await getTestPayload();
    try {
      const database = second.payload.db as unknown as {
        drizzle: {
          insert: (table: unknown) => {
            values: (values: Record<string, unknown>) => Promise<unknown>;
          };
        };
        tableNameMap: Map<string, string>;
        tables: Record<string, unknown>;
      };
      const table = database.tables[database.tableNameMap.get("folders_tree_state") as string];
      const now = new Date().toISOString();
      await database.drizzle
        .insert(table)
        .values({ createdAt: now, id: 2, revision: 0, updatedAt: now });

      const verified = await verifyTree(second.payload);
      const repaired = await repairTree(second.payload);

      expect(issuesOfKind(verified, "treeStateRows")).toEqual([
        expect.objectContaining({ fixable: false, ids: [1, 2] }),
      ]);
      expect(repaired.conflicts.counts.treeStateRows).toBe(1);
      expect(repaired.fixed.total).toBe(0);
    } finally {
      await second.destroy();
    }
  });

  it("repair holds the tree lock, a dry run and verify do not", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await rewriteFolderRow(docs.id, { fullPath: { de: "/wrong", en: "/wrong" } });
    const adapter = payload.db as unknown as {
      find: (args: { collection: string }) => Promise<unknown>;
    };
    const originalFind = adapter.find;
    const lockHeldAtFolderRead: boolean[] = [];
    adapter.find = function find(this: unknown, args) {
      if (args.collection === "folders") {
        lockHeldAtFolderRead.push(isTreeLockHeld(payload));
      }

      return originalFind.call(this, args);
    };
    try {
      await verifyTree(payload);
      await repairTree(payload, { dryRun: true });
      await repairTree(payload);
    } finally {
      adapter.find = originalFind;
    }

    expect(lockHeldAtFolderRead).toEqual([false, false, true]);
  });

  it("a failed repair writes nothing and calls no hook", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await rewriteFolderRow(docs.id, { fullPath: { de: "/wrong", en: "/wrong" } });
    await createLegacyPage({ createdAt: "2025-01-01T00:00:00.000Z", slug: "legacy" });
    const adapter = payload.db as unknown as {
      updateOne: (args: { collection: string }) => Promise<unknown>;
    };
    const originalUpdate = adapter.updateOne;
    adapter.updateOne = function updateOne(this: unknown, args) {
      if (args.collection === "pages") {
        return Promise.reject(new Error("the page write fails"));
      }

      return originalUpdate.call(this, args);
    };

    try {
      await expect(repairTree(payload)).rejects.toThrow("the page write fails");
    } finally {
      adapter.updateOne = originalUpdate;
    }

    // The folder row was written first and rolled back with the rest.
    expect((await readRow("folders", docs.id)).fullPath).toEqual({ de: "/wrong", en: "/wrong" });
    expect(hookCalls).toEqual([]);
    expect(isTreeLockHeld(payload)).toBe(false);
  });
});

describe("quick", () => {
  it("quick reads the folder rows in one query and leaves the pages to the full pass", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await createFolder(payload, { parent: docs.id, slug: "guide" });
    // Page-side drift only a full pass can see.
    await createPost({ orderKey: null, pathSegment: null, slug: "legacy" });

    const { calls, result } = await countDbCalls(payload, () =>
      verifyTree(payload, { quick: true })
    );

    expect(calls).toEqual([{ collection: "folders", method: "find" }]);
    expect(result).toMatchObject({ ok: true, quick: true });
    const full = await verifyTree(payload);
    expect(full.ok).toBe(false);
    expect(kindsOf(full)).toEqual(["orderKeyMissing", "pageSegment"]);
  });
});

describe("the endpoints", () => {
  const editor = { email: "verify-editor@example.com", password: "test-password" };

  beforeAll(async () => {
    await harness.payload.create({
      collection: "users",
      data: { ...editor, role: "editor" } as never,
      overrideAccess: true,
    });
  });

  const call = <TBody>(
    path: string,
    { body, user, anonymous }: { anonymous?: boolean; body?: unknown; user?: typeof editor } = {}
  ) =>
    callEndpoint<TBody>({
      anonymous,
      body,
      config: harness.config,
      method: body === undefined ? "GET" : "POST",
      path,
      payload: harness.payload,
      payloadInstanceCacheKey: harness.cacheKey,
      ...(user ? { user } : {}),
    });

  it("verify: quick for any signed-in user, the full pass for repair rights", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await rewriteFolderRow(docs.id, { fullPath: { de: "/wrong", en: "/wrong" } });

    const quickAsEditor = await call<VerifyResult>("/folders-tree/verify?quick=1", {
      user: editor,
    });
    const quickAsAdmin = await call<VerifyResult & { canRepair?: boolean }>(
      "/folders-tree/verify?quick=1"
    );
    const fullAsEditor = await call("/folders-tree/verify", { user: editor });
    const fullAsAdmin = await call<VerifyResult & { canRepair?: boolean }>("/folders-tree/verify");
    const quickAnonymous = await call("/folders-tree/verify?quick=1", { anonymous: true });
    const badFlag = await call("/folders-tree/verify?quick=maybe");

    expect(quickAsEditor.status).toBe(200);
    expect(quickAsEditor.body).toMatchObject({ ok: false, quick: true });
    expect(quickAsEditor.body.counts.folderPath).toBe(1);
    // The admin learns from the quick answer whether to offer Rebuild full URLs: the dev app's
    // `access.repair` is for the admin role only, so an editor passes every other rule and still
    // gets false.
    expect((quickAsEditor.body as { canRepair?: boolean }).canRepair).toBe(false);
    expect(quickAsAdmin.body.canRepair).toBe(true);
    expect(fullAsAdmin.body.canRepair).toBeUndefined();
    expect(fullAsEditor.status).toBe(403);
    expect(fullAsAdmin.status).toBe(200);
    expect(fullAsAdmin.body).toMatchObject({ fixable: 1, ok: false, quick: false });
    expect(quickAnonymous.status).toBe(403);
    expect(badFlag.status).toBe(400);
  });

  it("repair: admins only, a dry run first, then the repair", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await rewriteFolderRow(docs.id, { fullPath: { de: "/wrong", en: "/wrong" } });

    const asEditor = await call("/folders-tree/repair", { body: {}, user: editor });
    const anonymous = await call("/folders-tree/repair", { anonymous: true, body: {} });
    const badBody = await call("/folders-tree/repair", { body: { dryRun: "yes" } });
    const dryRun = await call<RepairResult>("/folders-tree/repair", { body: { dryRun: true } });

    expect(asEditor.status).toBe(403);
    expect(anonymous.status).toBe(403);
    expect(badBody.status).toBe(400);
    expect(dryRun.status).toBe(200);
    expect(dryRun.body).toMatchObject({ dryRun: true, revision: null });
    expect(dryRun.body.fixed.counts.folderPath).toBe(1);
    expect((await readRow("folders", docs.id)).fullPath).toEqual({ de: "/wrong", en: "/wrong" });

    const repaired = await call<RepairResult>("/folders-tree/repair", { body: {} });

    expect(repaired.status).toBe(200);
    expect(repaired.body).toMatchObject({ dryRun: false });
    expect(repaired.body.fixed.counts.folderPath).toBe(1);
    expect((await readRow("folders", docs.id)).fullPath).toEqual({ de: "/docs", en: "/docs" });
    expect(hookCalls.map((hookCall) => hookCall.reason)).toEqual(["repair"]);
  });
});

describe("an app without localization", () => {
  it("verifies and repairs folder paths, page segments and keys in the one slot", async () => {
    const plain = await getTestPayload({ localized: false });
    try {
      const { payload } = plain;
      const docs = await createFolder(payload, { name: "Docs", slug: "docs" });
      const guide = await createFolder(payload, { parent: docs.id, slug: "guide" });
      const readPlain = async (collection: "folders" | "pages", id: number) =>
        (await payload.db.findOne({
          collection,
          where: { id: { equals: id } },
        })) as unknown as Row;
      const { id: _id, createdAt: _createdAt, ...stored } = await readPlain("folders", guide.id);
      await payload.db.updateOne({
        collection: "folders",
        data: { ...stored, ancestorIds: "/", depth: 1, fullPath: "/elsewhere/guide" },
        id: guide.id,
        returning: false,
      });
      const legacy = (await payload.db.create({
        collection: "pages",
        data: {
          _status: "published",
          createdAt: "2025-01-01T00:00:00.000Z",
          folder: guide.id,
          slug: "start",
          title: "Start",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      })) as unknown as Row;

      const verified = await verifyTree(payload);

      expect(issuesOfKind(verified, "folderPath")[0].fullPath).toEqual([
        { expected: "/docs/guide", locale: null, stored: "/elsewhere/guide" },
      ]);
      expect(verified.counts).toMatchObject({ orderKeyMissing: 1, pageSegment: 1 });

      await repairTree(payload);

      expect((await readPlain("folders", guide.id)).fullPath).toBe("/docs/guide");
      expect((await readPlain("pages", legacy.id)).pathSegment).toBe("start");
      expect((await readPlain("pages", legacy.id)).orderKey).toEqual(expect.any(String));
      expect(await verifyTree(payload)).toMatchObject({ ok: true });
    } finally {
      await plain.destroy();
    }
  });
});

describe("trashed content", () => {
  it("a trashed page and a trashed folder are out of the tree, and a trashed redirect target is gone", async () => {
    const trashed = await getTestPayload({ trash: true });
    try {
      const { payload } = trashed;
      const deletedAt = "2026-01-02T00:00:00.000Z";
      const createdAt = "2026-01-01T00:00:00.000Z";
      const createPostRow = async (slug: string, orderKey: string, extra = {}) =>
        (await payload.db.create({
          collection: "posts",
          data: {
            createdAt,
            orderKey,
            pathSegment: slug,
            slug,
            structureRevision: 0,
            title: slug,
            updatedAt: createdAt,
            ...extra,
          },
        })) as unknown as Row;
      const live = await createPostRow("news", "a0");
      // The same segment, and no key at all: only a live page counts.
      await createPostRow("news", "", { deletedAt });
      const trashedTarget = await createPostRow("old", "a1", { deletedAt });
      const folder = await createFolder(payload, { slug: "gone" });
      const {
        id: _id,
        createdAt: _createdAt,
        ...stored
      } = (await payload.db.findOne({
        collection: "folders",
        locale: "all",
        where: { id: { equals: folder.id } },
      })) as unknown as Row;
      // Trashed with a path that no longer follows its parent.
      await payload.db.updateOne({
        collection: "folders",
        data: { ...stored, deletedAt, fullPath: { de: "/stale", en: "/stale" } },
        id: folder.id,
        returning: false,
      });
      for (const [fromPath, target] of [
        ["/was-live", live],
        ["/was-trashed", trashedTarget],
      ] as const) {
        await payload.db.create({
          collection: "folder-redirects" as never,
          data: {
            createdAt,
            fromPath,
            kind: "page",
            locale: "en",
            lookupKey: `en:${fromPath}`,
            target: { relationTo: "posts", value: target.id },
            updatedAt: createdAt,
          },
        });
      }

      const verified = await verifyTree(payload);

      expect(kindsOf(verified)).toEqual(["danglingRedirect"]);
      expect(issuesOfKind(verified, "danglingRedirect")).toEqual([
        expect.objectContaining({ fromPath: "/was-trashed" }),
      ]);
    } finally {
      await trashed.destroy();
    }
  });
});
