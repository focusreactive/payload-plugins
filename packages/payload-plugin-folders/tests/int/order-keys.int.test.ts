import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  compareSiblings,
  isUsableOrderKey,
  keysForInsert,
  loadSiblings,
} from "../../src/core/orderKeys.js";
import { isTreeLockHeld, withTreeLock } from "../../src/core/treeLock.js";
import type { ResolvedOptions } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import {
  createFolder,
  createPage,
  createTestRequest,
  resolveTestOptions,
} from "../helpers/treeFixtures.js";

let harness: TestPayload;
let bottomHarness: TestPayload;
let options: ResolvedOptions;

beforeAll(async () => {
  harness = await getTestPayload();
  bottomHarness = await getTestPayload({ foldersOptions: { newItemPosition: "bottom" } });
  options = resolveTestOptions(harness);
});

afterAll(async () => {
  await harness?.destroy();
  await bottomHarness?.destroy();
});

const slugsInTreeOrder = async (testPayload: TestPayload, folderId: number): Promise<string[]> => {
  const { docs } = await testPayload.payload.find({
    collection: "pages",
    depth: 0,
    overrideAccess: true,
    sort: "orderKey",
    where: { folder: { equals: folderId } },
  });

  return docs.map((doc) => doc.slug as string);
};

/** Stored keys written past the plugin's hooks, to craft the broken neighbours a repair has to fix. */
const forceOrderKey = (collection: "pages" | "folders", id: number, orderKey: string | null) =>
  harness.payload.update({
    collection,
    context: { foldersInternal: true },
    data: { orderKey },
    id,
    overrideAccess: true,
  });

const readKeys = async (folderId: number) => {
  const { docs } = await harness.payload.find({
    collection: "pages",
    depth: 0,
    overrideAccess: true,
    where: { folder: { equals: folderId } },
  });

  return new Map(docs.map((doc) => [doc.id, doc.orderKey as string | null]));
};

describe("order keys", () => {
  it("three creates come back newest first", async () => {
    const folder = await createFolder(harness.payload);
    for (const slug of ["first", "second", "third"]) {
      await createPage(harness.payload, { folder: folder.id, slug });
    }

    expect(await slugsInTreeOrder(harness, folder.id)).toEqual(["third", "second", "first"]);
  });

  it("newItemPosition bottom reverses", async () => {
    const folder = await createFolder(bottomHarness.payload);
    for (const slug of ["first", "second", "third"]) {
      await createPage(bottomHarness.payload, { folder: folder.id, slug });
    }

    expect(await slugsInTreeOrder(bottomHarness, folder.id)).toEqual(["first", "second", "third"]);
  });

  it("folders and pages share one key space in a folder", async () => {
    const parent = await createFolder(harness.payload);
    const page = await createPage(harness.payload, { folder: parent.id, slug: "p" });
    const child = await createFolder(harness.payload, { parent: parent.id });

    // The folder was created last, so it sits on top of the page.
    expect((child.orderKey as string) < (page.orderKey as string)).toBe(true);
  });

  it("20 parallel creates in one folder get 20 distinct ordered keys", async () => {
    const folder = await createFolder(harness.payload);

    const created = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        index % 4 === 0
          ? harness.payload.create({
              collection: "posts",
              data: { folder: folder.id, slug: `post-${index}`, title: `Post ${index}` },
              depth: 0,
              overrideAccess: true,
            })
          : createPage(harness.payload, { folder: folder.id, slug: `page-${index}` })
      )
    );

    const keys = created.map((doc) => doc.orderKey as string);
    expect(new Set(keys).size).toBe(20);
    expect(keys.every((key) => isUsableOrderKey(key))).toBe(true);

    // Every key the server handed out is the one stored, and the mixed list sorts without ties.
    const request = await createTestRequest(harness.payload);
    const siblings = (await loadSiblings(request, options, folder.id)).sort(compareSiblings);
    expect(siblings).toHaveLength(20);
    const sortedKeys = siblings.map((sibling) => sibling.orderKey as string);
    expect(sortedKeys).toEqual([...keys].sort());
    expect(isTreeLockHeld(harness.payload)).toBe(false);
  });

  it("equal neighbour keys trigger a rebalance instead of throwing", async () => {
    const folder = await createFolder(harness.payload);
    const pages: Array<Awaited<ReturnType<typeof createPage>>> = [];
    for (const slug of ["a", "b", "c", "d"]) {
      pages.push(await createPage(harness.payload, { folder: folder.id, slug }));
    }
    // Creation order is d, c, b, a from the top. Force the two middle rows onto one key.
    await forceOrderKey("pages", pages[1].id, "a5");
    await forceOrderKey("pages", pages[2].id, "a5");

    const request = await createTestRequest(harness.payload);
    const [insertKey] = await withTreeLock(request, () =>
      keysForInsert(request, options, {
        at: { after: { collection: "pages", id: pages[1].id } },
        count: 1,
        parent: folder.id,
      })
    );
    const keys = await readKeys(folder.id);

    // Both rows were re-keyed, in their previous order, and the new key sits between them.
    expect(keys.get(pages[1].id) as string).not.toBe(keys.get(pages[2].id));
    expect((keys.get(pages[1].id) as string) < insertKey).toBe(true);
    expect(insertKey < (keys.get(pages[2].id) as string)).toBe(true);
    expect(await slugsInTreeOrder(harness, folder.id)).toHaveLength(4);
  });

  it("a 33-character key triggers a rebalance that keeps the order", async () => {
    const folder = await createFolder(harness.payload);
    const pages: Array<Awaited<ReturnType<typeof createPage>>> = [];
    for (const slug of ["a", "b", "c"]) {
      pages.push(await createPage(harness.payload, { folder: folder.id, slug }));
    }
    await forceOrderKey("pages", pages[1].id, `a0${"1".repeat(31)}`);
    const orderBefore = await slugsInTreeOrder(harness, folder.id);

    const request = await createTestRequest(harness.payload);
    await withTreeLock(request, () =>
      keysForInsert(request, options, {
        at: { after: { collection: "pages", id: pages[0].id } },
        count: 1,
        parent: folder.id,
      })
    );

    const keys = await readKeys(folder.id);
    expect([...keys.values()].every((key) => (key as string).length <= 32)).toBe(true);
    expect(await slugsInTreeOrder(harness, folder.id)).toEqual(orderBefore);
  });

  it("unkeyed rows sort last by createdAt", async () => {
    const folder = await createFolder(harness.payload);
    const keyed = await createPage(harness.payload, { folder: folder.id, slug: "keyed" });
    const unkeyedOld = await harness.payload.create({
      collection: "pages",
      context: { foldersInternal: true },
      data: { folder: folder.id, slug: "unkeyed-old", title: "Old" },
      overrideAccess: true,
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    const unkeyedNew = await harness.payload.create({
      collection: "pages",
      context: { foldersInternal: true },
      data: { folder: folder.id, slug: "unkeyed-new", title: "New" },
      overrideAccess: true,
    });
    expect(unkeyedOld.orderKey).toBeFalsy();

    const request = await createTestRequest(harness.payload);
    const siblings = (await loadSiblings(request, options, folder.id)).sort(compareSiblings);
    expect(siblings.map((sibling) => sibling.id)).toEqual([keyed.id, unkeyedOld.id, unkeyedNew.id]);

    // A create on top still works with unkeyed rows around, and inserting at the end keys them in
    // the same order.
    await createPage(harness.payload, { folder: folder.id, slug: "newest" });
    await withTreeLock(request, () =>
      keysForInsert(request, options, { at: "end", count: 1, parent: folder.id })
    );
    const keys = await readKeys(folder.id);
    expect([...keys.values()].every((key) => isUsableOrderKey(key))).toBe(true);
    expect(await slugsInTreeOrder(harness, folder.id)).toEqual([
      "newest",
      "keyed",
      "unkeyed-old",
      "unkeyed-new",
    ]);
  });

  it("a rebalance patches the latest draft version without touching its content", async () => {
    const folder = await createFolder(harness.payload);
    const page = await harness.payload.create({
      collection: "pages",
      data: { folder: folder.id, slug: "draft-page", title: "English title" },
      draft: true,
      overrideAccess: true,
    });
    await harness.payload.update({
      collection: "pages",
      data: { title: "Deutscher Titel" },
      draft: true,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });
    const sibling = await createPage(harness.payload, { folder: folder.id, slug: "other" });
    await forceOrderKey("pages", page.id, "a5");
    await forceOrderKey("pages", sibling.id, "a5");

    const request = await createTestRequest(harness.payload);
    await withTreeLock(request, () =>
      keysForInsert(request, options, {
        at: { after: { collection: "pages", id: page.id } },
        count: 1,
        parent: folder.id,
      })
    );

    const mainRow = await harness.payload.findByID({
      collection: "pages",
      depth: 0,
      draft: false,
      id: page.id,
      overrideAccess: true,
    });
    const { docs: versions } = await harness.payload.findVersions({
      collection: "pages",
      depth: 0,
      limit: 1,
      locale: "all",
      overrideAccess: true,
      where: { and: [{ parent: { equals: page.id } }, { latest: { equals: true } }] },
    });
    const latest = versions[0].version as { orderKey?: string; title?: unknown };
    expect(latest.orderKey).toBe(mainRow.orderKey);
    expect(latest.orderKey).not.toBe("a5");
    expect(latest.title).toEqual({ de: "Deutscher Titel", en: "English title" });
  });

  it("revision increases after each structural write", async () => {
    const readRevision = async (): Promise<number> => {
      const state = await harness.payload.findGlobal({
        overrideAccess: true,
        slug: "folders-tree-state" as never,
      });

      return (state as { revision?: number | null }).revision ?? 0;
    };

    const start = await readRevision();
    const folder = await createFolder(harness.payload);
    const afterFolder = await readRevision();
    await createPage(harness.payload, { folder: folder.id });
    const afterPage = await readRevision();
    await harness.payload.update({
      collection: "folders",
      data: { name: "Renamed" },
      id: folder.id,
      overrideAccess: true,
    });
    const afterUpdate = await readRevision();

    expect(afterFolder).toBeGreaterThan(start);
    expect(afterPage).toBeGreaterThan(afterFolder);
    expect(afterUpdate).toBeGreaterThan(afterPage);
  });
});

describe("the tree lock", () => {
  it("a failed create releases the tree lock", async () => {
    // Both creates fail after the hooks took the lock: a missing required field is only found
    // by Payload's field validation, which runs after the collection hooks.
    await expect(
      harness.payload.create({
        collection: "folders",
        data: { slug: "nameless" } as never,
        overrideAccess: true,
      })
    ).rejects.toThrow();
    await expect(
      harness.payload.create({
        collection: "pages",
        data: { slug: "titleless" } as never,
        overrideAccess: true,
      })
    ).rejects.toThrow();

    expect(isTreeLockHeld(harness.payload)).toBe(false);
    const folder = await Promise.race([
      createFolder(harness.payload),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error("the next create is still waiting for the lock"));
        }, 5000);
      }),
    ]);
    expect(folder.id).toBeDefined();
  });

  it("parallel creates survive failures in between", async () => {
    const folder = await createFolder(harness.payload);
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, index) =>
        index % 3 === 0
          ? harness.payload.create({
              collection: "pages",
              data: { folder: folder.id, slug: `broken-${index}` } as never,
              overrideAccess: true,
            })
          : createPage(harness.payload, { folder: folder.id, slug: `ok-${index}` })
      )
    );

    expect(results.filter((result) => result.status === "rejected")).toHaveLength(4);
    expect(await slugsInTreeOrder(harness, folder.id)).toHaveLength(8);
    expect(isTreeLockHeld(harness.payload)).toBe(false);
  });

  it("withTreeLock runs its work in one transaction and releases after a throw", async () => {
    const request = await createTestRequest(harness.payload);
    await expect(
      withTreeLock(request, async () => {
        await harness.payload.create({
          collection: "folders",
          data: { name: "rolled-back", slug: "rolled-back" },
          overrideAccess: true,
          req: request,
        });
        throw new Error("abort");
      })
    ).rejects.toThrow("abort");

    expect(isTreeLockHeld(harness.payload)).toBe(false);
    const { totalDocs } = await harness.payload.count({
      collection: "folders",
      overrideAccess: true,
      where: { slug: { equals: "rolled-back" } },
    });
    expect(totalDocs).toBe(0);
  });

  it("two Payload instances never queue behind each other", async () => {
    const request = await createTestRequest(harness.payload);
    let secondInstanceFinished = false;

    await withTreeLock(request, async () => {
      await createFolder(bottomHarness.payload);
      secondInstanceFinished = true;
    });

    expect(secondInstanceFinished).toBe(true);
  });
});

describe("a client never chooses an order key", () => {
  it("a REST create keeps no client orderKey", async () => {
    const folder = await createFolder(harness.payload);
    const rest = await callEndpoint<{ doc: { orderKey: string } }>({
      body: { folder: folder.id, orderKey: "zz", slug: "rest-page", title: "Rest page" },
      config: harness.config,
      method: "POST",
      path: "/pages?depth=0",
      payload: harness.payload,
    });
    expect(rest.status).toBe(201);
    expect(rest.body.doc.orderKey).not.toBe("zz");
    expect(isUsableOrderKey(rest.body.doc.orderKey)).toBe(true);

    const restFolder = await callEndpoint<{ doc: { orderKey: string } }>({
      body: { name: "Rest folder", orderKey: "zz", parent: folder.id, slug: "rest-child" },
      config: harness.config,
      method: "POST",
      path: "/folders?depth=0",
      payload: harness.payload,
    });
    expect(restFolder.status).toBe(201);
    expect(restFolder.body.doc.orderKey).not.toBe("zz");
    // The new folder went on top of the page created a moment earlier.
    expect(restFolder.body.doc.orderKey < rest.body.doc.orderKey).toBe(true);
  });

  it("a Local API create with overrideAccess keeps no client orderKey either", async () => {
    const folder = await createFolder(harness.payload);
    const page = await harness.payload.create({
      collection: "pages",
      data: { folder: folder.id, orderKey: "zz", slug: "local-page", title: "Local page" },
      overrideAccess: true,
    });
    const child = await harness.payload.create({
      collection: "folders",
      data: { name: "Local child", orderKey: "zz", parent: folder.id, slug: "local-child" },
      overrideAccess: true,
    });

    expect(page.orderKey).not.toBe("zz");
    expect(child.orderKey).not.toBe("zz");
    expect(isUsableOrderKey(page.orderKey)).toBe(true);
  });
});

// A SQLite adapter without transactionOptions has no transactions at all: the lock cannot follow a
// commit, so the operation's own afterOperation hook (or the watchdog) gives it back.
describe.skipIf(process.env.TEST_DB === "postgres")("the tree lock without transactions", () => {
  let plainHarness: TestPayload;

  beforeAll(async () => {
    plainHarness = await getTestPayload({ sqliteTransactions: false });
  });

  afterAll(async () => {
    await plainHarness?.destroy();
  });

  it("20 parallel creates get 20 distinct keys and release the lock afterwards", async () => {
    const { payload } = plainHarness;
    const folder = await createFolder(payload);

    const created = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        createPage(payload, { folder: folder.id, slug: `plain-${index}` })
      )
    );

    expect(new Set(created.map((page) => page.orderKey)).size).toBe(20);
    expect(isTreeLockHeld(payload)).toBe(false);
  });

  it("a failed create is released by the watchdog", async () => {
    const { payload } = plainHarness;

    await expect(
      payload.create({
        collection: "pages",
        data: { slug: "no-title" } as never,
        overrideAccess: true,
      })
    ).rejects.toThrow();
    expect(isTreeLockHeld(payload)).toBe(true);

    await createFolder(payload);
    expect(isTreeLockHeld(payload)).toBe(false);
  });
});

describe("a write in every locale at once", () => {
  it("computes the path of every locale from one locale: all write", async () => {
    const { payload } = harness;
    const created = await harness.payload.create({
      collection: "folders",
      data: {
        name: { de: "Aktuelles", en: "Blog" },
        slug: { de: "aktuelles", en: "blog" },
      } as never,
      depth: 0,
      locale: "all" as never,
      overrideAccess: true,
    });

    const stored = (await payload.findByID({
      collection: "folders",
      depth: 0,
      id: created.id,
      locale: "all" as never,
      overrideAccess: true,
    })) as unknown as { fullPath: Record<string, string>; name: Record<string, string> };
    expect(stored.fullPath).toEqual({ de: "/aktuelles", en: "/blog" });
    expect(stored.name).toEqual({ de: "Aktuelles", en: "Blog" });
  });
});
