import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { patchLatestVersionStructure } from "../../src/core/structureWrite.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";

let harness: TestPayload;
let adminUser: unknown;

beforeAll(async () => {
  harness = await getTestPayload();
  await harness.payload.create({
    collection: "users",
    data: { email: "guard-admin@example.com", password: "test-password", role: "admin" },
    overrideAccess: true,
  });
  ({ user: adminUser } = await harness.payload.login({
    collection: "users",
    data: { email: "guard-admin@example.com", password: "test-password" },
  }));
});

afterAll(async () => {
  await harness?.destroy();
});

type Structure = { folder: number | null; orderKey: string | null; structureRevision: number };

const catchError = async (work: Promise<unknown>): Promise<Record<string, unknown>> => {
  try {
    await work;
  } catch (error) {
    return error as Record<string, unknown>;
  }
  throw new Error("expected the call to fail");
};

/**
 * What a move does (spec section 5.3): the structural columns of the main row and of the latest
 * version, written at database level. P-15 owns the real move; this stands in for it.
 */
const moveAtDatabaseLevel = async (
  payload: Payload,
  collection: "pages" | "posts",
  id: number,
  structure: Structure
): Promise<void> => {
  const updatedAt = new Date().toISOString();
  await payload.db.updateOne({
    collection,
    data: { ...structure, updatedAt },
    id,
    returning: false,
  });
  if (collection === "pages") {
    const request = await createTestRequest(payload);
    await patchLatestVersionStructure(request, collection, id, structure, updatedAt);
  }
};

const readMain = async (payload: Payload, id: number): Promise<Structure> => {
  const page = await payload.findByID({
    collection: "pages",
    depth: 0,
    draft: false,
    id,
    overrideAccess: true,
  });

  return {
    folder: page.folder as number | null,
    orderKey: page.orderKey as string | null,
    structureRevision: page.structureRevision as number,
  };
};

const readLatestVersion = async (payload: Payload, id: number) => {
  const { docs } = await payload.findVersions({
    collection: "pages",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { and: [{ parent: { equals: id } }, { latest: { equals: true } }] },
  });

  return docs[0].version as unknown as Structure & { title: Record<string, string> | string };
};

describe("structure guard", () => {
  it("Local API folder change at the current revision is refused", async () => {
    const { payload } = harness;
    const original = await createFolder(payload, { name: "Guard original" });
    const other = await createFolder(payload, { name: "Guard other" });
    const page = await createPage(payload, { folder: original.id });

    const folderError = await catchError(
      payload.update({
        collection: "pages",
        data: { folder: other.id, structureRevision: 0 },
        id: page.id,
        overrideAccess: true,
      })
    );
    const orderKeyError = await catchError(
      payload.update({
        collection: "pages",
        data: { orderKey: "zz", structureRevision: 0 },
        id: page.id,
        overrideAccess: true,
      })
    );

    for (const error of [folderError, orderKeyError]) {
      expect(error.status).toBe(400);
      expect(error.message).toBe("Use moveItems() to move content");
    }
    expect(await readMain(payload, page.id)).toEqual({
      folder: original.id,
      orderKey: page.orderKey,
      structureRevision: 0,
    });
  });

  it("Local API folder change with an old revision is replaced by the stored folder", async () => {
    const { payload } = harness;
    const original = await createFolder(payload, { name: "Stale original" });
    const moved = await createFolder(payload, { name: "Stale moved" });
    const page = await createPage(payload, { folder: original.id });
    await moveAtDatabaseLevel(payload, "pages", page.id, {
      folder: moved.id,
      orderKey: "a5",
      structureRevision: 1,
    });

    // A form loaded before the move still carries the old folder, key and revision 0.
    const saved = await payload.update({
      collection: "pages",
      data: { folder: original.id, orderKey: "a0", structureRevision: 0, title: "Saved late" },
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect(saved).toMatchObject({ folder: moved.id, orderKey: "a5", structureRevision: 1 });
    expect(saved.title).toBe("Saved late");
    expect(await readMain(payload, page.id)).toEqual({
      folder: moved.id,
      orderKey: "a5",
      structureRevision: 1,
    });
  });

  it("a folder change that names no revision is refused too, because Payload fills the stored one", async () => {
    const { payload } = harness;
    const original = await createFolder(payload, { name: "Bare original" });
    const other = await createFolder(payload, { name: "Bare other" });
    const page = await createPage(payload, { folder: original.id });

    const error = await catchError(
      payload.update({
        collection: "pages",
        data: { folder: other.id, title: "Bare" },
        id: page.id,
        overrideAccess: true,
      })
    );

    expect(error.status).toBe(400);
    expect(error.message).toBe("Use moveItems() to move content");
  });

  it("a draft save writes the main row's structure into the new version", async () => {
    const { payload } = harness;
    const original = await createFolder(payload, { name: "Draft original" });
    const moved = await createFolder(payload, { name: "Draft moved" });
    const page = await createPage(payload, { folder: original.id });
    await moveAtDatabaseLevel(payload, "pages", page.id, {
      folder: moved.id,
      orderKey: "a7",
      structureRevision: 2,
    });

    await payload.update({
      collection: "pages",
      data: { folder: original.id, structureRevision: 0, title: "Autosaved" },
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });

    expect(await readLatestVersion(payload, page.id)).toMatchObject({
      folder: moved.id,
      orderKey: "a7",
      structureRevision: 2,
    });
    expect(await readMain(payload, page.id)).toEqual({
      folder: moved.id,
      orderKey: "a7",
      structureRevision: 2,
    });
  });

  it("version restore keeps the current folder", async () => {
    const { payload } = harness;
    const original = await createFolder(payload, { name: "Restore original" });
    const moved = await createFolder(payload, { name: "Restore moved" });
    const page = await payload.create({
      collection: "pages",
      data: { _status: "published", folder: original.id, slug: "restore-me", title: "First" },
      depth: 0,
      overrideAccess: true,
    });
    await payload.update({
      collection: "pages",
      data: { _status: "published", title: "Second" },
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    const { docs: olderVersions } = await payload.findVersions({
      collection: "pages",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { and: [{ parent: { equals: page.id } }, { latest: { equals: false } }] },
    });
    const olderVersion = olderVersions[0];
    expect((olderVersion.version as unknown as Structure).folder).toBe(original.id);
    await moveAtDatabaseLevel(payload, "pages", page.id, {
      folder: moved.id,
      orderKey: "a5",
      structureRevision: 1,
    });

    await payload.restoreVersion({
      collection: "pages",
      depth: 0,
      id: olderVersion.id,
      overrideAccess: true,
    });

    expect(await readMain(payload, page.id)).toEqual({
      folder: moved.id,
      orderKey: "a5",
      structureRevision: 1,
    });
    expect(await readLatestVersion(payload, page.id)).toMatchObject({
      folder: moved.id,
      orderKey: "a5",
      structureRevision: 1,
    });
    const restored = await payload.findByID({
      collection: "pages",
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    expect(restored.title).toBe("First");

    // The same restore as an editor sees it, with field access applied.
    await payload.restoreVersion({
      collection: "pages",
      depth: 0,
      id: olderVersion.id,
      overrideAccess: false,
      user: adminUser as never,
    });
    expect(await readMain(payload, page.id)).toEqual({
      folder: moved.id,
      orderKey: "a5",
      structureRevision: 1,
    });
    expect(await readLatestVersion(payload, page.id)).toMatchObject({
      folder: moved.id,
      structureRevision: 1,
    });
  });

  it("stock duplicate of a root page succeeds as a non-root draft", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Company", slug: "dup-company" });
    const root = await payload.create({
      collection: "pages",
      data: {
        _status: "published",
        folder: folder.id,
        isFolderRoot: true,
        slug: "company-home",
        title: "Company home",
      },
      depth: 0,
      overrideAccess: true,
    });
    expect(root.isFolderRoot).toBe(true);

    const copy = await payload.duplicate({
      collection: "pages",
      depth: 0,
      draft: true,
      id: root.id,
      overrideAccess: true,
    });

    expect(copy.id).not.toBe(root.id);
    expect(copy).toMatchObject({
      _status: "draft",
      folder: folder.id,
      isFolderRoot: false,
      structureRevision: 0,
    });
    const original = await payload.findByID({
      collection: "pages",
      depth: 0,
      id: root.id,
      overrideAccess: true,
    });
    expect(original.isFolderRoot).toBe(true);
  });

  it("duplicate gets a fresh order key and -copy", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Copies", slug: "dup-copies" });
    const original = await createPage(payload, { folder: folder.id, slug: "brochure" });

    const first = await payload.duplicate({
      collection: "pages",
      depth: 0,
      draft: true,
      id: original.id,
      overrideAccess: true,
    });
    const second = await payload.duplicate({
      collection: "pages",
      depth: 0,
      draft: true,
      id: original.id,
      overrideAccess: true,
    });

    expect(first.slug).toBe("brochure-copy");
    expect(second.slug).toBe("brochure-copy-2");
    expect(first.pathSegment).toBe("brochure-copy");
    expect(first.orderKey).toBeTruthy();
    expect(first.orderKey).not.toBe(original.orderKey);
    // A new item goes to the top of its folder.
    expect((first.orderKey as string) < (original.orderKey as string)).toBe(true);
    expect((second.orderKey as string) < (first.orderKey as string)).toBe(true);
    expect(first.folder).toBe(folder.id);
  });

  it("a duplicate of a page with a de slug suffixes only the locales that have one", async () => {
    const { payload } = harness;
    const page = await createPage(payload, { slug: "dup-localized" });
    await payload.update({
      collection: "pages",
      data: { slug: "dup-lokalisiert", title: "Lokalisiert" },
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });

    const copy = await payload.duplicate({
      collection: "pages",
      depth: 0,
      draft: true,
      id: page.id,
      locale: "all" as never,
      overrideAccess: true,
    });

    const stored = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: copy.id,
      locale: "all",
      overrideAccess: true,
    })) as unknown as { slug: Record<string, string> };
    expect(stored.slug).toEqual({ de: "dup-lokalisiert-copy", en: "dup-localized-copy" });
  });

  it("a create accepts the folder and assigns its own order key", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Create in place" });

    const page = await payload.create({
      collection: "pages",
      data: { folder: folder.id, orderKey: "zz", slug: "in-place", title: "In place" },
      depth: 0,
      overrideAccess: true,
    });

    expect(page.folder).toBe(folder.id);
    expect(page.orderKey).not.toBe("zz");
    expect(page.orderKey).toBeTruthy();
  });

  it("a guarded update leaves the caller's req context and locale unchanged", async () => {
    const { payload } = harness;
    const page = await createPage(payload, {});
    const request = await createTestRequest(payload);
    const localeBefore = request.locale;

    await payload.update({
      collection: "pages",
      data: { title: "Same req" },
      depth: 0,
      id: page.id,
      overrideAccess: true,
      req: request,
    });

    // Payload keeps its own bookkeeping keys, prefixed with an underscore, in the context.
    expect(Object.keys(request.context).filter((key) => !key.startsWith("_"))).toEqual([]);
    expect(request.locale).toBe(localeBefore);
  });
});

describe("structure guard on folders", () => {
  it("a folder orderKey change at the current revision is refused", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Key guard" });

    const error = await catchError(
      payload.update({
        collection: "folders",
        data: { orderKey: "zz", structureRevision: 0 },
        id: folder.id,
        overrideAccess: true,
      })
    );

    expect(error.status).toBe(400);
    expect(error.message).toBe("Use moveItems() to move content");
  });

  it("a folder parent change with an old revision is replaced by the stored parent", async () => {
    const { payload } = harness;
    const parent = await createFolder(payload, { name: "Parent guard" });
    const other = await createFolder(payload, { name: "Other guard" });
    const child = await createFolder(payload, { name: "Child guard", parent: parent.id });
    await payload.db.updateOne({
      collection: "folders",
      data: { structureRevision: 3 },
      id: child.id,
      returning: false,
    });

    const saved = await payload.update({
      collection: "folders",
      data: { name: "Child renamed", parent: other.id, structureRevision: 1 },
      depth: 0,
      id: child.id,
      overrideAccess: true,
    });

    expect(saved).toMatchObject({
      name: "Child renamed",
      orderKey: child.orderKey,
      parent: parent.id,
      structureRevision: 3,
    });
  });
});
