import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { checkAllowedTypes } from "../../src/core/allowedTypes.js";
import { isTreeLockHeld } from "../../src/core/treeLock.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { countDbWrites } from "../helpers/countDbWrites.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import {
  createFolder,
  createPage,
  createTestRequest,
  resolveTestOptions,
} from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearTree(harness.payload);
});

type FolderTypes = {
  allowedTypes: string[] | null;
  defaultType: string | null;
  fullPath: Record<string, string | null>;
  id: number;
  lockSubfolderTypes: boolean | null;
  name: Record<string, string | null>;
  slug: Record<string, string | null>;
  typesLockedBy: number | null;
};

const readFolder = async (payload: Payload, id: number): Promise<FolderTypes> =>
  (await payload.findByID({
    collection: "folders",
    depth: 0,
    id,
    locale: "all",
    overrideAccess: true,
  })) as unknown as FolderTypes;

const setTypes = (
  payload: Payload,
  id: number,
  data: {
    allowedTypes?: Array<"pages" | "posts">;
    defaultType?: "pages" | "posts" | null;
    lockSubfolderTypes?: boolean;
  }
) =>
  payload.update({
    collection: "folders",
    data: data as never,
    depth: 0,
    id,
    overrideAccess: true,
  });

const createTypedFolder = (
  payload: Payload,
  data: {
    allowedTypes?: Array<"pages" | "posts">;
    defaultType?: "pages" | "posts";
    lockSubfolderTypes?: boolean;
    name: string;
    parent?: number | null;
    slug: string;
  }
) =>
  payload.create({
    collection: "folders",
    data: { parent: null, ...data } as never,
    depth: 0,
    overrideAccess: true,
  });

const fieldMessages = (error: unknown): Array<{ message: string; path: string }> =>
  ((error as { data?: { errors?: Array<{ message: string; path: string }> } }).data?.errors ??
    []) as Array<{ message: string; path: string }>;

const catchError = async (work: Promise<unknown>): Promise<Record<string, unknown>> => {
  try {
    await work;
  } catch (error) {
    return error as Record<string, unknown>;
  }
  throw new Error("expected the call to fail");
};

/** A folder with six subfolders: four directly below it and two below the first of those. */
const createLockableTree = async (payload: Payload) => {
  const root = await createTypedFolder(payload, { name: "Blog", slug: "blog" });
  const direct = [];
  for (const slug of ["news", "events", "guides", "reviews"]) {
    direct.push(await createFolder(payload, { name: slug, parent: root.id, slug }));
  }
  const nested = [];
  for (const slug of ["2025", "2026"]) {
    nested.push(
      await createFolder(payload, { name: slug, parent: direct[0].id, slug: `y${slug}` })
    );
  }

  return { all: [...direct, ...nested], direct, nested, root };
};

describe("allowed types", () => {
  it("a page create in an Article-only folder is refused with the message", async () => {
    const { config, payload } = harness;
    const articles = await createTypedFolder(payload, {
      allowedTypes: ["posts"],
      name: "Articles",
      slug: "articles",
    });

    const error = await catchError(
      createPage(payload, { folder: articles.id, slug: "not-an-article", title: "Not an article" })
    );

    expect(error.status).toBe(400);
    expect(fieldMessages(error)).toEqual([
      { message: 'This folder does not accept the type "Page"', path: "folder" },
    ]);
    const created = await payload.count({
      collection: "pages",
      overrideAccess: true,
      where: { folder: { equals: articles.id } },
    });
    expect(created.totalDocs).toBe(0);

    // The allowed type is accepted, over REST as well.
    const accepted = await callEndpoint<{ doc: { id: number } }>({
      body: { folder: articles.id, slug: "an-article", title: "An article" },
      config,
      method: "POST",
      path: "/posts",
      payload,
    });
    expect(accepted.status).toBe(201);
    const refused = await callEndpoint({
      body: { folder: articles.id, slug: "rest-page", title: "Rest page", _status: "draft" },
      config,
      method: "POST",
      path: "/pages?draft=true",
      payload,
    });
    expect(refused.status).toBe(400);
  });

  it("one allowed type becomes the default", async () => {
    const { payload } = harness;

    const single = await createTypedFolder(payload, {
      allowedTypes: ["posts"],
      name: "Single",
      slug: "single",
    });
    expect((await readFolder(payload, single.id)).defaultType).toBe("posts");

    // Two types keep the default that is still allowed.
    await setTypes(payload, single.id, { allowedTypes: ["posts", "pages"] });
    expect((await readFolder(payload, single.id)).defaultType).toBe("posts");
    // A default that leaves the list is dropped.
    await setTypes(payload, single.id, { allowedTypes: ["pages", "posts"], defaultType: "pages" });
    await setTypes(payload, single.id, { allowedTypes: ["posts"] });
    expect((await readFolder(payload, single.id)).defaultType).toBe("posts");
    // Back to one other type: that one is the default.
    await setTypes(payload, single.id, { allowedTypes: ["pages"] });
    expect((await readFolder(payload, single.id)).defaultType).toBe("pages");

    // All types: the default is the author's choice.
    await setTypes(payload, single.id, { allowedTypes: [], defaultType: "posts" });
    expect((await readFolder(payload, single.id)).defaultType).toBe("posts");

    // A default outside the allowed types is refused.
    await setTypes(payload, single.id, { allowedTypes: ["pages"] });
    const error = await catchError(setTypes(payload, single.id, { defaultType: "posts" }));
    expect(error.status).toBe(400);
    expect(fieldMessages(error)).toEqual([
      { message: "The default type must be one of the allowed types", path: "defaultType" },
    ]);
  });

  it("locking copies types to six subfolders", async () => {
    const { payload } = harness;
    const { all, root } = await createLockableTree(payload);
    expect(all).toHaveLength(6);
    // One subfolder has its own de name and slug, which the lock must leave alone.
    await payload.update({
      collection: "folders",
      data: { name: "Neuigkeiten", slug: "neuigkeiten" },
      depth: 0,
      id: all[0].id,
      locale: "de",
      overrideAccess: true,
    });
    // One has an en row only; a lock must not give it a de row.
    const enOnly = (await payload.db.create({
      collection: "folders",
      data: {
        ancestorIds: `/${root.id}/`,
        depth: 2,
        fullPath: { en: "/blog/en-only" },
        name: { en: "En only" },
        orderKey: "a0",
        parent: root.id,
        slug: { en: "en-only" },
        structureRevision: 0,
      },
    })) as unknown as { id: number };
    const before = await Promise.all(
      [...all, enOnly].map((folder) => readFolder(payload, folder.id))
    );

    await setTypes(payload, root.id, { allowedTypes: ["posts"], lockSubfolderTypes: true });

    const after = await Promise.all(
      [...all, enOnly].map((folder) => readFolder(payload, folder.id))
    );
    for (const [index, folder] of after.entries()) {
      expect(folder.allowedTypes).toEqual(["posts"]);
      expect(folder.typesLockedBy).toBe(root.id);
      expect(folder.defaultType).toBe("posts");
      expect(folder.lockSubfolderTypes).toBeFalsy();
      // Every locale's name, slug and path is exactly what it was, and no locale row appeared.
      expect(folder.name).toEqual(before[index].name);
      expect(folder.slug).toEqual(before[index].slug);
      expect(folder.fullPath).toEqual(before[index].fullPath);
    }
    expect(Object.keys(after.at(-1)?.fullPath ?? {})).toEqual(["en"]);
    expect((await readFolder(payload, root.id)).lockSubfolderTypes).toBe(true);
    expect((await readFolder(payload, root.id)).typesLockedBy).toBeNull();

    // New types on a locked folder reach the subfolders again.
    await setTypes(payload, root.id, { allowedTypes: ["posts", "pages"] });
    for (const folder of all) {
      expect((await readFolder(payload, folder.id)).allowedTypes?.sort()).toEqual([
        "pages",
        "posts",
      ]);
    }
  });

  it("locking needs specific types", async () => {
    const { payload } = harness;
    const folder = await createTypedFolder(payload, { name: "Open", slug: "open" });

    const error = await catchError(setTypes(payload, folder.id, { lockSubfolderTypes: true }));

    expect(error.status).toBe(400);
    expect(fieldMessages(error)).toEqual([
      {
        message: "Choose specific page types before locking the types of subfolders",
        path: "lockSubfolderTypes",
      },
    ]);
  });

  it("a locked subfolder refuses a type edit", async () => {
    const { payload } = harness;
    const { direct, nested, root } = await createLockableTree(payload);
    await setTypes(payload, root.id, { allowedTypes: ["posts"], lockSubfolderTypes: true });

    for (const subfolder of [direct[1], nested[0]]) {
      const error = await catchError(setTypes(payload, subfolder.id, { allowedTypes: ["pages"] }));
      expect(error.status).toBe(400);
      expect(fieldMessages(error)).toEqual([
        { message: "The page types of this folder are locked by /blog", path: "allowedTypes" },
      ]);
      const lockError = await catchError(
        setTypes(payload, subfolder.id, { lockSubfolderTypes: true })
      );
      expect(fieldMessages(lockError)).toEqual([
        {
          message: "The page types of this folder are locked by /blog",
          path: "lockSubfolderTypes",
        },
      ]);
    }
    // Naming the same types is not an edit.
    await setTypes(payload, direct[1].id, { allowedTypes: ["posts"] });

    // A Local API call that overrides access cannot move or clear the lock marker either.
    await payload.update({
      collection: "folders",
      data: { typesLockedBy: null } as never,
      depth: 0,
      id: direct[1].id,
      overrideAccess: true,
    });
    const stored = await readFolder(payload, direct[1].id);
    expect(stored.allowedTypes).toEqual(["posts"]);
    expect(stored.typesLockedBy).toBe(root.id);
  });

  it("unlocking clears typesLockedBy", async () => {
    const { payload } = harness;
    const { all, root } = await createLockableTree(payload);
    await setTypes(payload, root.id, { allowedTypes: ["posts"], lockSubfolderTypes: true });

    await setTypes(payload, root.id, { lockSubfolderTypes: false });

    for (const folder of all) {
      const stored = await readFolder(payload, folder.id);
      expect(stored.typesLockedBy).toBeNull();
      // They keep the types they were given, as Storyblok does, and can be edited again.
      expect(stored.allowedTypes).toEqual(["posts"]);
    }
    await setTypes(payload, all[0].id, { allowedTypes: ["pages"] });
    expect((await readFolder(payload, all[0].id)).allowedTypes).toEqual(["pages"]);
  });

  it("a new subfolder of a locked folder inherits the lock", async () => {
    const { payload } = harness;
    const { direct, root } = await createLockableTree(payload);
    await setTypes(payload, root.id, { allowedTypes: ["posts"], lockSubfolderTypes: true });

    const child = await createFolder(payload, { name: "Fresh", parent: root.id, slug: "fresh" });
    const grandchild = await createFolder(payload, {
      name: "Deeper",
      parent: direct[2].id,
      slug: "deeper",
    });

    for (const folder of [child, grandchild]) {
      const stored = await readFolder(payload, folder.id);
      expect(stored.allowedTypes).toEqual(["posts"]);
      expect(stored.typesLockedBy).toBe(root.id);
      expect(stored.defaultType).toBe("posts");
    }
    // A page of another type cannot be created in it, and its types cannot be chosen at create.
    const pageError = await catchError(
      createPage(harness.payload, { folder: child.id, slug: "nope", title: "Nope" })
    );
    expect(pageError.status).toBe(400);
    const createError = await catchError(
      createTypedFolder(payload, {
        allowedTypes: ["pages"],
        name: "Other",
        parent: root.id,
        slug: "other",
      })
    );
    expect(fieldMessages(createError)).toEqual([
      { message: "The page types of this folder are locked by /blog", path: "allowedTypes" },
    ]);
  });

  it("a failure while locking leaves the folder and its subfolders unchanged", async () => {
    const { payload } = harness;
    const { all, root } = await createLockableTree(payload);
    const original = payload.db.updateOne.bind(payload.db);
    vi.spyOn(payload.db, "updateOne").mockImplementation((args) => {
      if (args.collection === "folders" && args.id === all[5].id) {
        return Promise.reject(new Error("disk full"));
      }

      return original(args);
    });

    await expect(
      setTypes(payload, root.id, { allowedTypes: ["posts"], lockSubfolderTypes: true })
    ).rejects.toThrow("disk full");
    vi.restoreAllMocks();

    for (const folder of [root, ...all]) {
      const stored = await readFolder(payload, folder.id);
      expect(stored.allowedTypes ?? []).toEqual([]);
      expect(stored.typesLockedBy).toBeNull();
      expect(stored.lockSubfolderTypes).toBeFalsy();
    }
    expect(isTreeLockHeld(payload)).toBe(false);
  });

  it("a bulk update of folder types is refused", async () => {
    const { payload } = harness;
    const folder = await createTypedFolder(payload, { name: "Bulk types", slug: "bulk-types" });

    const error = await catchError(
      payload.update({
        collection: "folders",
        data: { allowedTypes: ["posts"] } as never,
        depth: 0,
        overrideAccess: true,
        where: { id: { equals: folder.id } },
      })
    );

    expect(error.status).toBe(400);
    expect((await readFolder(payload, folder.id)).allowedTypes ?? []).toEqual([]);
  });

  it("a lock writes folder rows only and no locale row", async () => {
    const { payload } = harness;
    const { all, root } = await createLockableTree(payload);

    const { writes } = await countDbWrites(payload, () =>
      setTypes(payload, root.id, { allowedTypes: ["posts"], lockSubfolderTypes: true })
    );

    expect(
      writes.filter((write) => write.collection !== "folders" && write.method === "updateOne")
    ).toEqual([]);
    expect(
      writes.filter(
        (write) => write.method === "updateOne" && all.some((folder) => folder.id === write.id)
      )
    ).toHaveLength(all.length);
  });

  describe("checkAllowedTypes", () => {
    it("checkAllowedTypes finds a disallowed page inside a moved folder", async () => {
      const { payload } = harness;
      const options = resolveTestOptions(harness);
      const req = await createTestRequest(payload);
      const target = await createTypedFolder(payload, {
        allowedTypes: ["posts"],
        name: "Articles",
        slug: "articles",
      });
      const moved = await createFolder(payload, { name: "Moved", slug: "moved" });
      const inner = await createFolder(payload, { name: "Inner", parent: moved.id, slug: "inner" });
      const outsidePage = await createPage(payload, { slug: "stays-put", title: "Stays put" });
      const innerPage = await createPage(payload, {
        folder: inner.id,
        slug: "deep",
        title: "Deep",
      });
      await payload.create({
        collection: "posts",
        data: { folder: inner.id, slug: "fine", title: "Fine" },
        depth: 0,
        overrideAccess: true,
      });

      const result = await checkAllowedTypes(target.id, [{ collection: "folders", id: moved.id }], {
        options,
        req,
      });

      expect(result.isAllowed).toBe(false);
      expect(result.disallowedCounts).toEqual({ pages: 1 });
      expect(result.samples).toEqual([
        { collection: "pages", id: innerPage.id, insideFolder: moved.id },
      ]);

      // A selected page is checked on its own, and the top of the tree accepts everything.
      const pageItem = await checkAllowedTypes(
        target.id,
        [{ collection: "pages", id: outsidePage.id }],
        { options, req }
      );
      expect(pageItem.samples).toEqual([
        { collection: "pages", id: outsidePage.id, insideFolder: null },
      ]);
      expect(
        (
          await checkAllowedTypes(null, [{ collection: "folders", id: moved.id }], {
            options,
            req,
          })
        ).isAllowed
      ).toBe(true);
      // A target that accepts all types, and one that accepts pages, refuse nothing.
      const open = await createFolder(payload, { name: "Open", slug: "open-target" });
      const pagesOnly = await createTypedFolder(payload, {
        allowedTypes: ["pages"],
        name: "Pages only",
        slug: "pages-only",
      });
      expect(
        (
          await checkAllowedTypes(open.id, [{ collection: "folders", id: moved.id }], {
            options,
            req,
          })
        ).isAllowed
      ).toBe(true);
      const pagesOnlyResult = await checkAllowedTypes(
        pagesOnly.id,
        [{ collection: "folders", id: moved.id }],
        { options, req }
      );
      expect(pagesOnlyResult.disallowedCounts).toEqual({ posts: 1 });
    });

    it("counts every refused page but names a bounded sample", async () => {
      const { payload } = harness;
      const options = resolveTestOptions(harness);
      const req = await createTestRequest(payload);
      const target = await createTypedFolder(payload, {
        allowedTypes: ["posts"],
        name: "Articles",
        slug: "articles",
      });
      const moved = await createFolder(payload, { name: "Many", slug: "many" });
      for (let index = 1; index <= 25; index += 1) {
        await payload.create({
          collection: "pages",
          context: { foldersInternal: true },
          data: { folder: moved.id, slug: `page-${index}`, title: `Page ${index}` } as never,
          depth: 0,
          draft: true,
          overrideAccess: true,
        });
      }

      const result = await checkAllowedTypes(target.id, [{ collection: "folders", id: moved.id }], {
        options,
        req,
      });

      expect(result.disallowedCounts).toEqual({ pages: 25 });
      expect(result.samples).toHaveLength(20);
      expect(new Set(result.samples.map((sample) => sample.id)).size).toBe(20);
    });
  });
});

describe("type lock limits", () => {
  let limited: TestPayload;

  beforeAll(async () => {
    limited = await getTestPayload({ foldersOptions: { limits: { maxFoldersPerMove: 3 } } });
  });

  afterAll(async () => {
    await limited?.destroy();
  });

  it("a lock over maxFoldersPerMove is refused before anything is written", async () => {
    const { payload } = limited;
    const root = await createTypedFolder(payload, { name: "Root", slug: "root" });
    for (const slug of ["one", "two", "three"]) {
      await createFolder(payload, { name: slug, parent: root.id, slug });
    }

    const error = await catchError(
      setTypes(payload, root.id, { allowedTypes: ["posts"], lockSubfolderTypes: true })
    );

    expect(error.status).toBe(400);
    expect(fieldMessages(error)).toEqual([
      {
        message: "This type lock would rewrite 4 folders; the limit is 3",
        path: "lockSubfolderTypes",
      },
    ]);
    expect((await readFolder(payload, root.id)).allowedTypes ?? []).toEqual([]);
  });
});
