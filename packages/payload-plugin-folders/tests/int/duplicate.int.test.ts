import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { OperationProgress } from "../../src/core/operations.js";
import { resolvePath } from "../../src/core/resolve.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type ItemRef = { collection: string; id: number };

type DuplicateBody = {
  copied?: number;
  created?: ItemRef[];
  errors?: Array<{
    data?: { count?: number; items?: ItemRef[]; reason?: string };
    message: string;
  }>;
  operationId?: number;
  total?: number;
};

type FolderRow = {
  allowedTypes: string[] | null;
  defaultType: string | null;
  id: number;
  lockSubfolderTypes: boolean | null;
  name: Record<string, string>;
  orderKey: string;
  parent: number | null;
  slug: Record<string, string>;
  typesLockedBy: number | null;
};

type PageRow = {
  _status: Record<string, string> | string;
  folder: number | null;
  id: number;
  isFolderRoot: boolean;
  orderKey: string;
  slug: Record<string, string> | string;
  title: Record<string, string> | string;
};

const password = "test-password";
const limited = { email: "duplicate-limited@example.com", password };

let harness: TestPayload;
let shallowHarness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
  shallowHarness = await getTestPayload({ foldersOptions: { maxDepth: 3 } });
  await harness.payload.create({
    collection: "users",
    data: { email: limited.email, password, role: "editorLimited" } as never,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await shallowHarness?.destroy();
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
  await clearTree(shallowHarness.payload);
});

const post = <TBody>(path: string, body: unknown, user?: { email: string; password: string }) =>
  callEndpoint<TBody>({
    body,
    config: harness.config,
    method: "POST",
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    ...(user ? { user } : {}),
  });

const duplicate = (body: unknown, user?: { email: string; password: string }) =>
  post<DuplicateBody>("/folders-tree/duplicate", body, user);

const pageRef = (id: number): ItemRef => ({ collection: "pages", id });
const postRef = (id: number): ItemRef => ({ collection: "posts", id });
const folderRef = (id: number): ItemRef => ({ collection: "folders", id });

const createLivePage = (
  payload: Payload,
  folder: number | null,
  slug: string,
  extra: Record<string, unknown> = {}
) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug, title: slug, ...extra } as never,
    depth: 0,
    overrideAccess: true,
  });

const createPost = (payload: Payload, folder: number | null, slug: string) =>
  payload.create({
    collection: "posts",
    data: { folder, slug, title: slug },
    depth: 0,
    overrideAccess: true,
  });

const readPage = async (payload: Payload, id: number): Promise<PageRow> =>
  (await payload.db.findOne({
    collection: "pages",
    locale: "all",
    where: { id: { equals: id } },
  })) as unknown as PageRow;

const readFolder = async (payload: Payload, id: number): Promise<FolderRow> =>
  (await payload.db.findOne({
    collection: "folders",
    locale: "all",
    where: { id: { equals: id } },
  })) as unknown as FolderRow;

const countAll = async (payload: Payload, collection: "folders" | "pages" | "posts") =>
  (await payload.db.count({ collection, where: { id: { exists: true } } })).totalDocs;

const statusOf = (status: PageRow["_status"], locale: string): string | undefined =>
  typeof status === "object" ? status[locale] : status;

describe("POST /folders-tree/duplicate", () => {
  it("a single copy is a draft on top with -copy", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const original = await createLivePage(payload, docs.id, "about", {
      blocks: [{ blockType: "hero", heading: "Hello" }],
      isFolderRoot: true,
    });
    await payload.update({
      collection: "pages",
      data: { slug: "ueber", title: "Ueber uns" },
      depth: 0,
      id: original.id,
      locale: "de",
      overrideAccess: true,
    });
    await createLivePage(payload, docs.id, "other");

    const { body, status } = await duplicate({ items: [pageRef(original.id)] });

    expect(status).toBe(200);
    expect(body.created).toHaveLength(1);
    const copy = await readPage(payload, body.created?.[0].id as number);
    // A draft in every locale, though the original is published.
    expect(statusOf(copy._status, "en")).toBe("draft");
    expect(statusOf(copy._status, "de")).toBe("draft");
    expect(copy.folder).toBe(docs.id);
    expect(copy.slug).toEqual({ de: "ueber-copy", en: "about-copy" });
    expect(copy.isFolderRoot).toBe(false);
    expect(copy.title).toEqual({ de: "Ueber uns", en: "about" });
    // On top of the folder.
    const siblings = await Promise.all(
      (await payload.find({ collection: "pages", depth: 0, overrideAccess: true })).docs.map(
        (page) => readPage(payload, page.id)
      )
    );
    for (const sibling of siblings.filter((page) => page.id !== copy.id)) {
      expect(copy.orderKey < sibling.orderKey).toBe(true);
    }
    // The copy is not at any URL yet, the original is untouched.
    expect(await resolvePath(payload, { overrideAccess: true, path: "/docs/about-copy" })).toEqual({
      type: "notFound",
    });
    expect(await resolvePath(payload, { overrideAccess: true, path: "/docs" })).toMatchObject({
      doc: { id: original.id },
      type: "page",
    });
    const stored = await payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id: copy.id,
      overrideAccess: true,
    });
    expect(stored.blocks).toHaveLength(1);
  });

  it("a single copy takes the name and segment the dialog chose", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const original = await createLivePage(payload, docs.id, "about");
    await createLivePage(payload, docs.id, "taken");

    const named = await duplicate({
      items: [pageRef(original.id)],
      overrides: { name: "About, second edition", slug: "about-2nd" },
    });
    const clash = await duplicate({
      items: [pageRef(original.id)],
      overrides: { slug: "taken" },
    });
    const invalid = await duplicate({
      items: [pageRef(original.id)],
      overrides: { slug: "Not Valid" },
    });

    expect(named.status).toBe(200);
    const copy = await readPage(payload, named.body.created?.[0].id as number);
    expect(copy.title).toMatchObject({ en: "About, second edition" });
    expect(copy.slug).toMatchObject({ en: "about-2nd" });
    expect(clash.status).toBe(409);
    expect(invalid.status).toBe(409);
    expect(await countAll(payload, "pages")).toBe(3);
  });

  it("a bulk copy into the same folder is refused", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const first = await createLivePage(payload, docs.id, "first");
    const second = await createLivePage(payload, docs.id, "second");

    const sameFolder = await duplicate({
      items: [pageRef(first.id), pageRef(second.id)],
      toFolder: docs.id,
    });
    const noFolder = await duplicate({ items: [pageRef(first.id), pageRef(second.id)] });

    expect(sameFolder.status).toBe(400);
    expect(sameFolder.body.errors?.[0].data?.reason).toBe("sameFolder");
    expect(sameFolder.body.errors?.[0].message).toContain("another folder");
    expect(noFolder.status).toBe(400);
    expect(await countAll(payload, "pages")).toBe(2);
  });

  it("a bulk copy into another folder succeeds", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const archive = await createFolder(payload, { slug: "archive" });
    const first = await createLivePage(payload, docs.id, "first");
    const second = await createLivePage(payload, docs.id, "second");
    const section = await createFolder(payload, { parent: docs.id, slug: "section" });
    await createLivePage(payload, archive.id, "second");

    const { body, status } = await duplicate({
      items: [pageRef(first.id), pageRef(second.id), folderRef(section.id)],
      toFolder: archive.id,
    });

    expect(status).toBe(200);
    expect(body.created).toHaveLength(3);
    expect(body.copied).toBe(3);
    const [firstCopy, secondCopy] = await Promise.all(
      (body.created ?? []).slice(0, 2).map((ref) => readPage(payload, ref.id))
    );
    const sectionCopy = await readFolder(payload, (body.created ?? [])[2].id);
    expect(firstCopy.folder).toBe(archive.id);
    // A segment that is free in the target stays; one that is taken there gets -copy.
    expect(firstCopy.slug).toMatchObject({ en: "first" });
    expect(secondCopy.slug).toMatchObject({ en: "second-copy" });
    expect(sectionCopy.parent).toBe(archive.id);
    expect(sectionCopy.slug).toMatchObject({ en: "section" });
    expect(statusOf(firstCopy._status, "en")).toBe("draft");
    // The selection keeps its order on top of the target: first, second, section (a folder sorts
    // by key like any sibling).
    expect(firstCopy.orderKey < secondCopy.orderKey).toBe(true);
    expect(secondCopy.orderKey < sectionCopy.orderKey).toBe(true);
    // The sources stay where they were.
    expect((await readPage(payload, first.id)).folder).toBe(docs.id);
    expect(await countAll(payload, "pages")).toBe(5);
  });

  it("a folder copy is deep and keeps allowedTypes", async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    const source = await payload.create({
      collection: "folders",
      data: {
        allowedTypes: ["posts", "pages"],
        defaultType: "posts",
        lockSubfolderTypes: true,
        name: "Source",
        parent: null,
        slug: "source",
      },
      depth: 0,
      overrideAccess: true,
    });
    const child = await createFolder(payload, { name: "Child", parent: source.id, slug: "child" });
    const grandchild = await createFolder(payload, {
      name: "Grandchild",
      parent: child.id,
      slug: "grandchild",
    });
    const lowest = await createPost(payload, grandchild.id, "lowest");
    const inChild = await createPost(payload, child.id, "in-child");
    const topPost = await createPost(payload, source.id, "top-post");
    const topPage = await createLivePage(payload, source.id, "top-page");
    expect(lowest.id).toBeDefined();
    expect(inChild.id).toBeDefined();
    expect((await readFolder(payload, child.id)).typesLockedBy).toBe(source.id);

    const { body, status } = await duplicate({
      items: [folderRef(source.id)],
      toFolder: target.id,
    });

    expect(status).toBe(200);
    // Every document of the copy counts, not only the one root: three folders and four pages.
    expect(body.copied).toBe(7);
    expect(body.created).toHaveLength(1);
    const copyId = body.created?.[0].id as number;
    const copy = await readFolder(payload, copyId);
    expect(copy).toMatchObject({
      allowedTypes: ["posts", "pages"],
      defaultType: "posts",
      lockSubfolderTypes: true,
      parent: target.id,
      slug: { en: "source" },
    });
    expect(copy.name).toMatchObject({ en: "Source" });

    const folders = (
      await payload.find({
        collection: "folders",
        depth: 0,
        overrideAccess: true,
        where: { parent: { equals: copyId } },
      })
    ).docs;
    expect(folders).toHaveLength(1);
    const [childCopy] = folders;
    // The lock follows the copy: its subfolders belong to the copied folder, not to the original.
    expect(await readFolder(payload, childCopy.id)).toMatchObject({
      allowedTypes: ["posts", "pages"],
      slug: { en: "child" },
      typesLockedBy: copyId,
    });
    const grandchildren = (
      await payload.find({
        collection: "folders",
        depth: 0,
        overrideAccess: true,
        where: { parent: { equals: childCopy.id } },
      })
    ).docs;
    expect(grandchildren).toHaveLength(1);

    const postsInCopy = (
      await payload.find({
        collection: "posts",
        depth: 0,
        overrideAccess: true,
        sort: "orderKey",
        where: { folder: { equals: copyId } },
      })
    ).docs;
    expect(postsInCopy.map((entry) => entry.slug)).toEqual(["top-post"]);
    expect(topPost.id).toBeDefined();
    const pagesInCopy = (
      await payload.find({
        collection: "pages",
        depth: 0,
        draft: true,
        overrideAccess: true,
        where: { folder: { equals: copyId } },
      })
    ).docs;
    expect(pagesInCopy).toHaveLength(1);
    expect(topPage.id).toBeDefined();
    expect(await countAll(payload, "posts")).toBe(6);
    expect(await countAll(payload, "folders")).toBe(7);
    // The original is untouched.
    expect((await readFolder(payload, source.id)).parent).toBeNull();
    expect(
      (
        await payload.count({
          collection: "folders",
          overrideAccess: true,
          where: { parent: { equals: source.id } },
        })
      ).totalDocs
    ).toBe(1);

    // Beside the original the copy takes -copy.
    const beside = await duplicate({ items: [folderRef(source.id)] });
    expect(beside.status).toBe(200);
    expect((await readFolder(payload, beside.body.created?.[0].id as number)).slug).toMatchObject({
      en: "source-copy",
    });
  });

  it("a copy into an Article-only folder of a page is refused", async () => {
    const { payload } = harness;
    const articles = await payload.create({
      collection: "folders",
      data: { allowedTypes: ["posts"], name: "Articles", parent: null, slug: "articles" },
      depth: 0,
      overrideAccess: true,
    });
    const page = await createLivePage(payload, null, "plain-page");
    const blogPost = await createPost(payload, null, "a-post");
    const section = await createFolder(payload, { slug: "section" });
    await createLivePage(payload, section.id, "inside-section");

    const refusedPage = await duplicate({ items: [pageRef(page.id)], toFolder: articles.id });
    const refusedFolder = await duplicate({
      items: [folderRef(section.id)],
      toFolder: articles.id,
    });
    const allowedPost = await duplicate({ items: [postRef(blogPost.id)], toFolder: articles.id });

    expect(refusedPage.status).toBe(400);
    expect(refusedPage.body.errors?.[0].data?.reason).toBe("type");
    expect(refusedPage.body.errors?.[0].message).toContain("accepts only Blog post pages");
    expect(refusedFolder.status).toBe(400);
    expect(allowedPost.status).toBe(200);
    expect(await countAll(payload, "pages")).toBe(2);
    expect(await countAll(payload, "folders")).toBe(2);
  });

  it("a copy that would go deeper than maxDepth is refused", async () => {
    const { payload } = shallowHarness;
    const first = await createFolder(payload, { slug: "one" });
    const second = await createFolder(payload, { parent: first.id, slug: "two" });
    const source = await createFolder(payload, { slug: "source" });
    const child = await createFolder(payload, { parent: source.id, slug: "child" });
    const page = await createLivePage(payload, second.id, "deep-page");
    const copyTo = (items: ItemRef[], toFolder: number) =>
      callEndpoint<DuplicateBody>({
        body: { items, toFolder },
        config: shallowHarness.config,
        method: "POST",
        path: "/folders-tree/duplicate",
        payload,
        payloadInstanceCacheKey: shallowHarness.cacheKey,
      });
    const before = await countAll(payload, "folders");

    // /one/two/source would be 3 deep, and /one/two/source/child 4.
    const tooDeep = await copyTo([folderRef(source.id)], second.id);
    // A page in /one/two is 3 deep; a copy of it into /one would be fine, into the copy below not.
    const pageFits = await copyTo([pageRef(page.id)], first.id);
    const emptySource = await createFolder(payload, { slug: "leaf" });
    const folderFits = await copyTo([folderRef(emptySource.id)], second.id);

    expect(tooDeep.status).toBe(400);
    expect(tooDeep.body.errors?.[0].data?.reason).toBe("depth");
    expect(tooDeep.body.errors?.[0].message).toBe(
      "This would make URLs 4 segments deep; the limit is 3"
    );
    expect(pageFits.status).toBe(200);
    expect(folderFits.status).toBe(200);
    expect(await countAll(payload, "folders")).toBe(before + 2);
    expect(child.id).toBeDefined();
  });

  it("a copied root page becomes a plain page, so its folder copy counts one level deeper", async () => {
    const { payload } = shallowHarness;
    const first = await createFolder(payload, { slug: "one" });
    const second = await createFolder(payload, { parent: first.id, slug: "two" });
    const source = await createFolder(payload, { slug: "source" });
    await createLivePage(payload, source.id, "start", { isFolderRoot: true });
    const copyTo = (toFolder: number) =>
      callEndpoint<DuplicateBody>({
        body: { items: [folderRef(source.id)], toFolder },
        config: shallowHarness.config,
        method: "POST",
        path: "/folders-tree/duplicate",
        payload,
        payloadInstanceCacheKey: shallowHarness.cacheKey,
      });

    // The folder copy would be /one/two/source (3 deep), but its copied page is no longer the
    // folder's root page, so it lands at /one/two/source/start-copy (4 deep).
    const refused = await copyTo(second.id);
    const fits = await copyTo(first.id);

    expect(refused.status).toBe(400);
    expect(refused.body.errors?.[0].data?.reason).toBe("depth");
    expect(refused.body.errors?.[0].message).toBe(
      "This would make URLs 4 segments deep; the limit is 3"
    );
    expect(fits.status).toBe(200);
    expect(await countAll(payload, "pages")).toBe(2);
  });

  it("a copy to the top level refuses a segment the site uses", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const reserved = await createLivePage(payload, docs.id, "api");
    const dotted = await createLivePage(payload, docs.id, "robots.txt");
    const plain = await createLivePage(payload, docs.id, "plain");

    const refusedReserved = await duplicate({ items: [pageRef(reserved.id)], toFolder: null });
    const refusedDotted = await duplicate({ items: [pageRef(dotted.id)], toFolder: null });
    const allowed = await duplicate({ items: [pageRef(plain.id)], toFolder: null });

    expect(refusedReserved.status).toBe(400);
    expect(refusedReserved.body.errors?.[0].data?.reason).toBe("reserved");
    expect(refusedDotted.status).toBe(400);
    expect(allowed.status).toBe(200);
    expect(await countAll(payload, "pages")).toBe(4);
  });

  it("a user who may not create in the target gets 403 and nothing is copied", async () => {
    const { payload } = harness;
    const own = await createFolder(payload, { slug: "own" });
    const outside = await createFolder(payload, { slug: "outside" });
    const page = await createLivePage(payload, own.id, "mine");
    const limitedUser = (
      await payload.find({
        collection: "users",
        depth: 0,
        overrideAccess: true,
        where: { email: { equals: limited.email } },
      })
    ).docs[0];
    await payload.update({
      collection: "users",
      data: { limitedFolder: own.id } as never,
      id: limitedUser.id,
      overrideAccess: true,
    });

    const refused = await duplicate({ items: [pageRef(page.id)], toFolder: outside.id }, limited);
    const allowed = await duplicate({ items: [pageRef(page.id)] }, limited);

    expect(refused.status).toBe(403);
    expect(refused.body.errors?.[0].data?.reason).toBe("forbidden");
    expect(allowed.status).toBe(200);
    expect(await countAll(payload, "pages")).toBe(2);
  });

  it("a refusal names a folder once and counts every refused item past the first 50", async () => {
    const { payload } = harness;
    const own = await createFolder(payload, { slug: "own" });
    const outside = await createFolder(payload, { slug: "outside" });
    const inner = await createFolder(payload, { parent: own.id, slug: "inner" });
    await createLivePage(payload, inner.id, "inner-page");
    const pageIds: number[] = [];
    for (let index = 1; index <= 60; index += 1) {
      pageIds.push((await createLivePage(payload, own.id, `many-${index}`)).id);
    }
    const limitedUser = (
      await payload.find({
        collection: "users",
        depth: 0,
        overrideAccess: true,
        where: { email: { equals: limited.email } },
      })
    ).docs[0];
    await payload.update({
      collection: "users",
      data: { limitedFolder: own.id } as never,
      id: limitedUser.id,
      overrideAccess: true,
    });

    const folderCopy = await duplicate(
      { items: [folderRef(inner.id)], toFolder: outside.id },
      limited
    );
    const manyCopy = await duplicate(
      { items: pageIds.map((id) => pageRef(id)), toFolder: outside.id },
      limited
    );

    expect(folderCopy.status).toBe(403);
    expect(folderCopy.body.errors?.[0].data?.items).toEqual([folderRef(inner.id)]);
    expect(folderCopy.body.errors?.[0].data?.count).toBe(1);
    expect(manyCopy.status).toBe(403);
    expect(manyCopy.body.errors?.[0].data?.count).toBe(60);
    expect(manyCopy.body.errors?.[0].data?.items).toHaveLength(50);
  });

  it("a 300-page folder copy runs as an operation", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { name: "Archive", slug: "archive" });
    for (let index = 1; index <= 300; index += 1) {
      await payload.create({
        collection: "posts",
        context: { foldersInternal: true },
        data: {
          folder: source.id,
          orderKey: `a${String(index).padStart(4, "0")}`,
          slug: `entry-${index}`,
          structureRevision: 0,
          title: `Entry ${index}`,
        },
        depth: 0,
        overrideAccess: true,
      });
    }

    const started = await duplicate({ items: [folderRef(source.id)] });

    expect(started.status).toBe(200);
    expect(started.body).toMatchObject({ total: 301 });
    expect(started.body.created).toBeUndefined();
    const operationId = started.body.operationId as number;
    expect(await countAll(payload, "folders")).toBe(1);

    const first = await post<OperationProgress>(`/folders-tree/operations/${operationId}/step`, {});
    expect(first.body).toEqual({ done: 200, status: "running", total: 301 });
    expect(await countAll(payload, "folders")).toBe(2);
    expect(await countAll(payload, "posts")).toBe(300 + 199);

    const second = await post<OperationProgress>(
      `/folders-tree/operations/${operationId}/step`,
      {}
    );
    expect(second.body).toEqual({ done: 301, status: "done", total: 301 });
    expect(await countAll(payload, "posts")).toBe(600);

    const copy = (
      await payload.find({
        collection: "folders",
        depth: 0,
        overrideAccess: true,
        where: { id: { not_equals: source.id } },
      })
    ).docs[0];
    const copies = (
      await payload.find({
        collection: "posts",
        depth: 0,
        limit: 400,
        overrideAccess: true,
        sort: "orderKey",
        where: { folder: { equals: copy.id } },
      })
    ).docs;
    expect(copies).toHaveLength(300);
    // The copies keep the order of the originals.
    expect(copies.map((entry) => entry.slug).slice(0, 3)).toEqual([
      "entry-1",
      "entry-2",
      "entry-3",
    ]);
    expect(copies.at(-1)?.slug).toBe("entry-300");
  });
});
