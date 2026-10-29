import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

const injectedFieldNames = [
  "folder",
  "orderKey",
  "structureRevision",
  "isFolderRoot",
  "pathSegment",
  "folderPath",
  "fullPath",
];

const findField = (payload: Payload, collectionSlug: string, fieldName: string) =>
  payload.collections[collectionSlug as "pages"].config.flattenedFields.find(
    (field) => field.name === fieldName
  );

let folderCounter = 0;
// These fixtures craft stored rows (paths, ancestors) directly, so the plugin's folder hooks, which
// would compute those values, are skipped. The hooks have their own tests (folder-paths.int.test.ts).
const createFolder = (
  payload: Payload,
  data: {
    ancestorIds?: string;
    depth?: number;
    fullPath?: string;
    name?: string;
    parent?: number | null;
  } = {}
) => {
  folderCounter += 1;
  return payload.create({
    collection: "folders",
    context: { foldersInternal: true },
    data: { name: `Folder ${folderCounter}`, slug: `folder-${folderCounter}`, ...data },
    overrideAccess: true,
  });
};

describe("data model", () => {
  it("page collections have every injected field", async () => {
    const { payload } = harness;

    for (const collectionSlug of ["pages", "posts"]) {
      for (const fieldName of injectedFieldNames) {
        expect(
          findField(payload, collectionSlug, fieldName),
          `${collectionSlug}.${fieldName}`
        ).toBeDefined();
      }
      const indexedPaths = payload.collections[
        collectionSlug as "pages"
      ].config.sanitizedIndexes.map((index) => index.fields.map((indexField) => indexField.path));
      expect(indexedPaths).toContainEqual(["folder", "orderKey"]);
    }

    const folders = payload.collections.folders.config;
    const folderFieldNames = folders.flattenedFields.map((field) => field.name);
    expect(folderFieldNames).toEqual(
      expect.arrayContaining([
        "name",
        "slug",
        "parent",
        "orderKey",
        "fullPath",
        "ancestorIds",
        "depth",
        "structureRevision",
        "allowedTypes",
        "defaultType",
        "lockSubfolderTypes",
        "typesLockedBy",
      ])
    );
    expect(
      folders.sanitizedIndexes.map((index) => index.fields.map((indexField) => indexField.path))
    ).toContainEqual(["parent", "orderKey"]);
    expect(folders.versions).toBeFalsy();
    expect(folders.labels.plural).toBe("Content");
    expect(Object.keys(payload.collections)).toEqual(
      expect.arrayContaining(["folders", "folder-redirects", "folder-operations"])
    );
    expect(payload.config.globals.map((global) => global.slug)).toContain("folders-tree-state");

    // folderPath is a virtual field that Payload resolves through the folder relationship, in reads
    // and in queries.
    const folder = await createFolder(payload, { fullPath: "/blog" });
    const page = await payload.create({
      collection: "pages",
      data: { folder: folder.id, slug: "post", title: "A post" },
      depth: 0,
      overrideAccess: true,
    });
    expect(page).toMatchObject({
      folder: folder.id,
      fullPath: null,
      isFolderRoot: false,
      structureRevision: 0,
    });
    const found = await payload.find({
      collection: "pages",
      overrideAccess: true,
      where: { folderPath: { equals: "/blog" } },
    });
    expect(found.docs.map((doc) => doc.id)).toEqual([page.id]);
    expect(found.docs[0].folderPath).toBe("/blog");
  });

  it("pathSegment is localized only when slug is", () => {
    const { payload } = harness;

    expect(findField(payload, "pages", "slug")?.localized).toBe(true);
    expect(findField(payload, "pages", "pathSegment")?.localized).toBe(true);
    expect(findField(payload, "posts", "slug")?.localized).toBeFalsy();
    expect(findField(payload, "posts", "pathSegment")?.localized).toBeFalsy();
  });

  it("a REST update cannot change folder or orderKey", async () => {
    const { config, payload } = harness;
    const original = await createFolder(payload, { fullPath: "/original" });
    const other = await createFolder(payload, { fullPath: "/other" });
    const page = await payload.create({
      collection: "pages",
      data: { folder: original.id, slug: "stays", title: "Stays" },
      overrideAccess: true,
    });
    await payload.update({
      collection: "pages",
      data: { orderKey: "a0" },
      id: page.id,
      overrideAccess: true,
    });

    const { body, status } = await callEndpoint<{
      doc: { folder: number; orderKey: string; title: string };
    }>({
      body: { folder: other.id, orderKey: "zz", structureRevision: 42, title: "Renamed" },
      config,
      method: "PATCH",
      path: `/pages/${page.id}?depth=0`,
      payload,
    });

    expect(status).toBe(200);
    expect(body.doc).toMatchObject({
      folder: original.id,
      orderKey: "a0",
      structureRevision: 0,
      title: "Renamed",
    });
    const reread = await payload.findByID({
      collection: "pages",
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    expect(reread).toMatchObject({ folder: original.id, orderKey: "a0", structureRevision: 0 });

    // A create may still set them, and so may the Local API once access is overridden.
    const moved = await payload.update({
      collection: "pages",
      data: { folder: other.id },
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    expect(moved.folder).toBe(other.id);
  });

  it("derived folder fields cannot be written over REST", async () => {
    const { config, payload } = harness;
    const derived = { ancestorIds: "/999/", depth: 7, fullPath: "/hacked", structureRevision: 42 };

    const created = await callEndpoint<{ doc: Record<string, unknown> }>({
      body: { name: "Rest folder", slug: "rest-folder", ...derived },
      config,
      method: "POST",
      path: "/folders?depth=0",
      payload,
    });
    expect(created.status).toBe(201);
    // The hooks compute these from the folder's own data and ignore what the client sent.
    expect(created.body.doc).toMatchObject({
      ancestorIds: "/",
      depth: 1,
      fullPath: "/rest-folder",
      structureRevision: 0,
    });

    const folder = await createFolder(payload, {
      ancestorIds: "/1/",
      depth: 1,
      fullPath: "/rest-original",
    });
    const updated = await callEndpoint<{ doc: Record<string, unknown> }>({
      body: { name: "Renamed over REST", ...derived },
      config,
      method: "PATCH",
      path: `/folders/${folder.id}?depth=0`,
      payload,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.doc).toMatchObject({
      ancestorIds: "/",
      depth: 1,
      fullPath: `/${folder.slug}`,
      name: "Renamed over REST",
      structureRevision: 0,
    });
  });

  it("a REST update cannot change folder parent or orderKey", async () => {
    const { config, payload } = harness;
    const parent = await createFolder(payload, { fullPath: "/rest-parent" });
    const other = await createFolder(payload, { fullPath: "/rest-other" });
    const child = await createFolder(payload, {
      fullPath: "/rest-parent/child",
      parent: parent.id,
    });
    await payload.update({
      collection: "folders",
      data: { orderKey: "a0" },
      id: child.id,
      overrideAccess: true,
    });

    const { body, status } = await callEndpoint<{ doc: Record<string, unknown> }>({
      body: { name: "Renamed child", orderKey: "zz", parent: other.id },
      config,
      method: "PATCH",
      path: `/folders/${child.id}?depth=0`,
      payload,
    });

    expect(status).toBe(200);
    expect(body.doc).toMatchObject({ name: "Renamed child", orderKey: "a0", parent: parent.id });
  });

  it("folder parent null round-trips as null", async () => {
    const { config, payload } = harness;
    const root = await createFolder(payload, { fullPath: "/null-root", parent: null });
    const child = await createFolder(payload, { fullPath: "/null-root/child", parent: root.id });

    const rereadRoot = await payload.findByID({
      collection: "folders",
      depth: 0,
      id: root.id,
      overrideAccess: true,
    });
    expect(rereadRoot.parent).toBeNull();
    const rereadChild = await payload.findByID({
      collection: "folders",
      depth: 0,
      id: child.id,
      overrideAccess: true,
    });
    expect(rereadChild.parent).toBe(root.id);

    const { body } = await callEndpoint<{ parent: unknown }>({
      config,
      path: `/folders/${root.id}?depth=0`,
      payload,
    });
    expect(body.parent).toBeNull();

    const roots = await payload.find({
      collection: "folders",
      overrideAccess: true,
      where: { parent: { equals: null } },
    });
    expect(roots.docs.map((doc) => doc.id)).toContain(root.id);
    expect(roots.docs.map((doc) => doc.id)).not.toContain(child.id);
  });

  it("two folders with one fullPath in one locale violate the unique index", async () => {
    const { payload } = harness;
    const first = await createFolder(payload, { fullPath: "/taken" });
    await payload.update({
      collection: "folders",
      context: { foldersInternal: true },
      data: { fullPath: "/vergeben", name: "Erster", slug: "erster" },
      id: first.id,
      locale: "de",
      overrideAccess: true,
    });

    await expect(createFolder(payload, { fullPath: "/taken" })).rejects.toThrow(
      /field is invalid: fullPath/u
    );

    // The index is per locale: another folder may use the first one's en path in de.
    const second = await createFolder(payload, { fullPath: "/second" });
    await expect(
      payload.update({
        collection: "folders",
        context: { foldersInternal: true },
        data: { fullPath: "/taken", name: "Zweiter", slug: "zweiter" },
        id: second.id,
        locale: "de",
        overrideAccess: true,
      })
    ).resolves.toBeDefined();
    await expect(
      payload.update({
        collection: "folders",
        context: { foldersInternal: true },
        data: { fullPath: "/vergeben" },
        id: second.id,
        locale: "de",
        overrideAccess: true,
      })
    ).rejects.toThrow(/field is invalid: fullPath/u);
  });

  it("the tree-lock global is read-only for a logged-in user", async () => {
    const { config, payload } = harness;

    const read = await callEndpoint({ config, path: "/globals/folders-tree-state", payload });
    expect(read.status).toBe(200);
    const { status } = await callEndpoint({
      body: { lockedAt: new Date().toISOString(), revision: 99 },
      config,
      method: "POST",
      path: "/globals/folders-tree-state",
      payload,
    });
    expect(status).toBe(403);
    const anonymous = await callEndpoint({
      anonymous: true,
      config,
      path: "/globals/folders-tree-state",
      payload,
    });
    expect(anonymous.status).toBe(403);
  });

  it("folder-redirects refuses REST create", async () => {
    const { config, payload } = harness;
    const folder = await createFolder(payload, { fullPath: "/redirect-target" });
    const row = {
      fromPath: "/old",
      kind: "page",
      locale: "en",
      lookupKey: "en:/old",
      target: { relationTo: "folders", value: folder.id },
    };

    const { status } = await callEndpoint({
      body: row,
      config,
      method: "POST",
      path: "/folder-redirects",
      payload,
    });
    expect(status).toBe(403);
    const { totalDocs } = await payload.count({
      collection: "folder-redirects",
      overrideAccess: true,
    });
    expect(totalDocs).toBe(0);

    // The plugin itself writes with overrideAccess: true.
    const created = await payload.create({
      collection: "folder-redirects",
      data: row,
      overrideAccess: true,
    } as never);
    expect(created.id).toBeDefined();
    const { status: updateStatus } = await callEndpoint({
      body: { fromPath: "/changed" },
      config,
      method: "PATCH",
      path: `/folder-redirects/${created.id}`,
      payload,
    });
    expect(updateStatus).toBe(403);
    const { status: deleteStatus } = await callEndpoint({
      config,
      method: "DELETE",
      path: `/folder-redirects/${created.id}`,
      payload,
    });
    expect(deleteStatus).toBe(200);
  });

  it("folders have no Duplicate", async () => {
    const { config, payload } = harness;
    const folder = await createFolder(payload, { fullPath: "/no-copy" });

    expect(payload.collections.folders.config.disableDuplicate).toBe(true);
    await expect(
      payload.duplicate({ collection: "folders", id: folder.id, overrideAccess: true })
    ).rejects.toThrow(/cannot be duplicated/u);
    const { status } = await callEndpoint({
      config,
      method: "POST",
      path: `/folders/${folder.id}/duplicate`,
      payload,
    });
    expect(status).toBeGreaterThanOrEqual(400);

    const { totalDocs } = await payload.count({
      collection: "folders",
      overrideAccess: true,
      where: { id: { equals: folder.id } },
    });
    expect(totalDocs).toBe(1);
  });
});
