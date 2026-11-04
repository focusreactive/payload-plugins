import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { moveItems } from "../../src/server/index.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { runGraphql } from "../helpers/runGraphql.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";

/**
 * A save from outside the plugin that names a different `folder`, `orderKey` or `parent` is
 * refused with a 400 instead of answering 200 while Payload drops the value (the structure fields
 * have `update: nobody` access). The admin's own saves carry the stored structure, or an older
 * revision after a move elsewhere; those stay a silent replace. A request without any revision
 * cannot be a stale replay, so it is a deliberate edit.
 */

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

type PageState = {
  folder: number | null;
  orderKey: string;
  structureRevision: number;
  title: string;
};

type FolderState = {
  name: string;
  orderKey: string;
  parent: number | null;
  structureRevision: number;
};

const readPage = async (payload: Payload, id: number): Promise<PageState> => {
  const page = (await payload.findByID({
    collection: "pages",
    depth: 0,
    id,
    locale: "en",
    overrideAccess: true,
  })) as unknown as PageState;

  return {
    folder: page.folder,
    orderKey: page.orderKey,
    structureRevision: page.structureRevision,
    title: page.title,
  };
};

const readFolder = async (payload: Payload, id: number): Promise<FolderState> => {
  const folder = (await payload.findByID({
    collection: "folders",
    depth: 0,
    id,
    locale: "en",
    overrideAccess: true,
  })) as unknown as FolderState;

  return {
    name: folder.name,
    orderKey: folder.orderKey,
    parent: folder.parent,
    structureRevision: folder.structureRevision,
  };
};

type ErrorBody = {
  errors?: Array<{ data?: { field?: string; reason?: string }; message: string }>;
};

const patch = (path: string, body: Record<string, unknown>) =>
  callEndpoint<ErrorBody>({
    body,
    config: harness.config,
    method: "PATCH",
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

const expectRefused = (result: Awaited<ReturnType<typeof patch>>, field: string) => {
  expect(result.status).toBe(400);
  const [error] = result.body.errors ?? [];
  expect(error.message).toContain(`"${field}" cannot be changed`);
  expect(error.message).not.toContain("through MCP updateDocument");
  expect(error.message).toContain("POST /api/folders-tree/move");
  expect(error.message).toContain("Nothing was saved.");
  expect(error.data).toMatchObject({ field, reason: "mcp-structure-change" });
};

const editorEmail = "structure-editor@example.com";

const createEditor = async (payload: Payload) => {
  const { docs } = await payload.find({
    collection: "users",
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: editorEmail } },
  });

  return (
    docs[0] ??
    (await payload.create({
      collection: "users",
      data: { email: editorEmail, password: "test-password", role: "admin" } as never,
      overrideAccess: true,
    }))
  );
};

const pageRef = (id: number) => ({ collection: "pages", id });
const folderRef = (id: number) => ({ collection: "folders", id });

describe("a REST PATCH on a page", () => {
  it("refuses a different folder at the stored revision and saves nothing", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    const result = await patch(`/pages/${page.id}`, {
      folder: guides.id,
      structureRevision: before.structureRevision,
      title: "Moved",
    });

    expectRefused(result, "folder");
    expect(await readPage(payload, page.id)).toEqual(before);
  });

  it("refuses a different folder that carries no revision, which a script usually sends", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    expectRefused(await patch(`/pages/${page.id}`, { folder: guides.id }), "folder");
    expectRefused(await patch(`/pages/${page.id}`, { folder: null }), "folder");
    expectRefused(await patch(`/pages/${page.id}`, { orderKey: "zz" }), "orderKey");
    expect(await readPage(payload, page.id)).toEqual(before);
  });

  it("refuses a draft save and an autosave that name a different folder", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    expectRefused(await patch(`/pages/${page.id}?draft=true`, { folder: guides.id }), "folder");
    expectRefused(
      await patch(`/pages/${page.id}?draft=true&autosave=true`, { folder: guides.id }),
      "folder"
    );
    expect(await readPage(payload, page.id)).toEqual(before);
  });

  it("passes what the admin form sends: the stored folder, orderKey and revision", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    const result = await patch(`/pages/${page.id}?locale=en`, {
      folder: products.id,
      orderKey: before.orderKey,
      structureRevision: before.structureRevision,
      title: "Edited in the admin",
    });

    expect(result.status).toBe(200);
    expect(await readPage(payload, page.id)).toEqual({ ...before, title: "Edited in the admin" });
  });

  it("passes a save without any structure field", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });

    const result = await patch(`/pages/${page.id}?locale=en`, { title: "Only a title" });

    expect(result.status).toBe(200);
    expect((await readPage(payload, page.id)).title).toBe("Only a title");
  });

  const movePage = async (slug: string) => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: `source-${slug}` });
    const target = await createFolder(payload, { slug: `target-${slug}` });
    const page = await createPage(payload, { folder: source.id, slug, title: "Original" });
    const staleForm = await readPage(payload, page.id);
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: target.id,
    });
    const moved = await readPage(payload, page.id);
    expect(moved.folder).toBe(target.id);
    expect(moved.structureRevision).toBeGreaterThan(staleForm.structureRevision);

    return { moved, page, source, staleForm, target };
  };

  it("passes a stale replay (the old folder with the older revision) and keeps the new folder", async () => {
    const { payload } = harness;
    const { moved, page, staleForm } = await movePage("stale-replay");

    const result = await patch(`/pages/${page.id}?locale=en`, {
      folder: staleForm.folder,
      orderKey: staleForm.orderKey,
      structureRevision: staleForm.structureRevision,
      title: "Saved from an old form",
    });

    expect(result.status).toBe(200);
    expect(await readPage(payload, page.id)).toEqual({
      ...moved,
      title: "Saved from an old form",
    });
  });

  it("passes a stale autosave and a stale replay that names only the older revision", async () => {
    const { payload } = harness;
    const { moved, page, staleForm } = await movePage("stale-autosave");

    const autosave = await patch(`/pages/${page.id}?draft=true&autosave=true&locale=en`, {
      folder: staleForm.folder,
      orderKey: staleForm.orderKey,
      structureRevision: staleForm.structureRevision,
      title: "Autosaved from an old form",
    });
    const revisionOnly = await patch(`/pages/${page.id}?locale=en`, {
      structureRevision: staleForm.structureRevision,
      title: "Revision only",
    });

    expect(autosave.status).toBe(200);
    expect(revisionOnly.status).toBe(200);
    const after = await readPage(payload, page.id);
    expect(after.folder).toBe(moved.folder);
    expect(after.orderKey).toBe(moved.orderKey);
    expect(after.structureRevision).toBe(moved.structureRevision);
  });

  it("passes the old folder with a null revision, the form of a page that predates the plugin", async () => {
    const { payload } = harness;
    const { moved, page, staleForm } = await movePage("stale-null");

    const result = await patch(`/pages/${page.id}?locale=en`, {
      folder: staleForm.folder,
      orderKey: staleForm.orderKey,
      structureRevision: null,
      title: "Saved from a pre-plugin form",
    });

    expect(result.status).toBe(200);
    expect((await readPage(payload, page.id)).folder).toBe(moved.folder);
  });

  it("refuses a different folder that carries the current revision of a moved page", async () => {
    const { payload } = harness;
    const { moved, page, source } = await movePage("deliberate-moved");

    const result = await patch(`/pages/${page.id}`, {
      folder: source.id,
      structureRevision: moved.structureRevision,
    });

    expectRefused(result, "folder");
    expect(await readPage(payload, page.id)).toEqual(moved);
  });
});

describe("a GraphQL update of a page", () => {
  const update = async (id: number, userId: number, data: string) =>
    runGraphql(
      harness,
      { id: userId },
      `mutation { updatePage(id: ${id}, data: { ${data} }) { id } }`
    );

  it("refuses a different folder and saves nothing", async () => {
    const { payload } = harness;
    const editor = await createEditor(payload);
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    const withoutRevision = await update(page.id, editor.id as number, `folder: ${guides.id}`);
    const atStoredRevision = await update(
      page.id,
      editor.id as number,
      `folder: ${guides.id}, structureRevision: ${before.structureRevision}`
    );

    for (const outcome of [withoutRevision, atStoredRevision]) {
      expect(outcome.errors?.join("\n")).toContain('"folder" cannot be changed');
      expect(outcome.errors?.join("\n")).not.toContain("through MCP updateDocument");
    }
    expect(await readPage(payload, page.id)).toEqual(before);
  });

  it("passes the stored structure sent back with a new title", async () => {
    const { payload } = harness;
    const editor = await createEditor(payload);
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    const outcome = await update(
      page.id,
      editor.id as number,
      `folder: ${products.id}, orderKey: "${before.orderKey}", structureRevision: ${before.structureRevision}, title: "Edited"`
    );

    expect(outcome.errors).toBeUndefined();
    expect((await readPage(payload, page.id)).title).toBe("Edited");
  });
});

describe("a Local API update of a page", () => {
  it("with overrideAccess false refuses a different folder, because field access would drop it", async () => {
    const { payload } = harness;
    const editor = await createEditor(payload);
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    await expect(
      payload.update({
        collection: "pages",
        data: { folder: guides.id, title: "Changed" } as never,
        depth: 0,
        id: page.id,
        locale: "en",
        overrideAccess: false,
        user: editor,
      })
    ).rejects.toMatchObject({
      data: { field: "folder", reason: "mcp-structure-change" },
      status: 400,
    });
    expect(await readPage(payload, page.id)).toEqual(before);
  });

  it("with overrideAccess false passes the stored structure and a stale replay", async () => {
    const { payload } = harness;
    const editor = await createEditor(payload);
    const source = await createFolder(payload, { slug: "source" });
    const target = await createFolder(payload, { slug: "target" });
    const page = await createPage(payload, { folder: source.id, slug: "gift-cards" });
    const staleForm = await readPage(payload, page.id);

    await payload.update({
      collection: "pages",
      data: { ...staleForm, title: "Stored structure" } as never,
      depth: 0,
      id: page.id,
      locale: "en",
      overrideAccess: false,
      user: editor,
    });
    await moveItems(payload, {
      items: [pageRef(page.id)],
      overrideAccess: true,
      toFolder: target.id,
    });
    await payload.update({
      collection: "pages",
      data: { ...staleForm, title: "Stale replay" } as never,
      depth: 0,
      id: page.id,
      locale: "en",
      overrideAccess: false,
      user: editor,
    });

    const after = await readPage(payload, page.id);
    expect(after.folder).toBe(target.id);
    expect(after.title).toBe("Stale replay");
  });

  it("with overrideAccess true is trusted: the collection's own guard answers, not the refusal of this file", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    await expect(
      payload.update({
        collection: "pages",
        data: { folder: guides.id, structureRevision: before.structureRevision } as never,
        depth: 0,
        id: page.id,
        overrideAccess: true,
      })
    ).rejects.toMatchObject({ message: "Use moveItems() to move content", status: 400 });
    expect(await readPage(payload, page.id)).toEqual(before);
  });

  it("with overrideAccess true passes the stored structure with a new title", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    await payload.update({
      collection: "pages",
      data: { ...before, title: "Host code" } as never,
      depth: 0,
      id: page.id,
      locale: "en",
      overrideAccess: true,
    });

    expect(await readPage(payload, page.id)).toEqual({ ...before, title: "Host code" });
  });

  it("is never refused when the plugin marks the request as its own", async () => {
    const { payload } = harness;
    const editor = await createEditor(payload);
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const req = await createTestRequest(payload);
    req.context.foldersInternal = true;
    req.user = { ...editor, collection: "users" } as never;

    await payload.update({
      collection: "pages",
      data: { folder: guides.id } as never,
      depth: 0,
      id: page.id,
      overrideAccess: false,
      req,
    });

    expect((await readPage(payload, page.id)).title).toBe("gift-cards");
  });
});

describe("a REST PATCH on a folder", () => {
  it("refuses a different parent, with or without a revision, and saves nothing", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const other = await createFolder(payload, { slug: "other" });
    const guides = await createFolder(payload, { parent: products.id, slug: "guides" });
    const before = await readFolder(payload, guides.id);

    expectRefused(await patch(`/folders/${guides.id}`, { parent: other.id }), "parent");
    expectRefused(await patch(`/folders/${guides.id}`, { parent: null }), "parent");
    expectRefused(
      await patch(`/folders/${guides.id}`, {
        parent: other.id,
        structureRevision: before.structureRevision,
      }),
      "parent"
    );
    expectRefused(await patch(`/folders/${guides.id}`, { orderKey: "zz" }), "orderKey");
    expect(await readFolder(payload, guides.id)).toEqual(before);
  });

  it("passes the stored parent, orderKey and revision with a new name", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { parent: products.id, slug: "guides" });
    const before = await readFolder(payload, guides.id);

    const result = await patch(`/folders/${guides.id}?locale=en`, {
      name: "Guides 2",
      orderKey: before.orderKey,
      parent: products.id,
      structureRevision: before.structureRevision,
    });

    expect(result.status).toBe(200);
    expect(await readFolder(payload, guides.id)).toEqual({ ...before, name: "Guides 2" });
  });

  it("passes a stale replay of the old parent with the older revision", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const other = await createFolder(payload, { slug: "other" });
    const guides = await createFolder(payload, { parent: products.id, slug: "guides" });
    const staleForm = await readFolder(payload, guides.id);
    await moveItems(payload, {
      items: [folderRef(guides.id)],
      overrideAccess: true,
      toFolder: other.id,
    });
    const moved = await readFolder(payload, guides.id);
    expect(moved.parent).toBe(other.id);

    const result = await patch(`/folders/${guides.id}?locale=en`, {
      name: "Saved from an old form",
      orderKey: staleForm.orderKey,
      parent: staleForm.parent,
      structureRevision: staleForm.structureRevision,
    });

    expect(result.status).toBe(200);
    expect(await readFolder(payload, guides.id)).toEqual({
      ...moved,
      name: "Saved from an old form",
    });
  });

  it("refuses a bulk update that names parent, and passes one that names other fields", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const other = await createFolder(payload, { slug: "other" });
    const guides = await createFolder(payload, { parent: products.id, slug: "guides" });
    const before = await readFolder(payload, guides.id);
    const where = `where[id][equals]=${guides.id}`;

    expectRefused(await patch(`/folders?${where}`, { parent: other.id }), "parent");
    expect((await patch(`/folders?${where}&locale=en`, { name: "Renamed in bulk" })).status).toBe(
      200
    );
    expect(await readFolder(payload, guides.id)).toEqual({ ...before, name: "Renamed in bulk" });
  });

  it("still allows a slug change, which runs the subtree rewrite", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { parent: products.id, slug: "guides" });

    const result = await patch(`/folders/${guides.id}?locale=en`, { slug: "manuals" });

    expect(result.status).toBe(200);
    const after = (await payload.findByID({
      collection: "folders",
      depth: 0,
      id: guides.id,
      locale: "en",
      overrideAccess: true,
    })) as unknown as { fullPath: string };
    expect(after.fullPath).toBe("/products/manuals");
  });
});
