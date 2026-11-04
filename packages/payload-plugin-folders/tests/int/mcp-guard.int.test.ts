import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";

/**
 * The stock `updateDocument` tool of `@payloadcms/plugin-mcp` reports "Document updated
 * successfully" even when Payload dropped a structure value, so the plugin refuses such an update
 * loudly. The calls below go through `POST /api/mcp`: plugin-mcp itself sets
 * `req.payloadAPI = "MCP"`, the tests do not.
 */

type ToolResult = { isError: boolean; text: string };

type PageState = { folder: number | null; fullPath: string; orderKey: string; revision: number };

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({ mcp: true });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const callTool = async (name: string, toolArguments: Record<string, unknown>) => {
  const { body } = await callEndpoint<{
    error?: { message: string };
    result?: { content: Array<{ text: string }>; isError?: boolean };
  }>({
    body: {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: { arguments: toolArguments, name },
    },
    config: harness.config,
    headers: { Accept: "application/json, text/event-stream" },
    method: "POST",
    path: "/mcp",
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });
  if (!body.result) {
    throw new Error(`MCP answered without a result: ${JSON.stringify(body)}`);
  }

  return {
    isError: Boolean(body.result.isError),
    text: body.result.content.map((part) => part.text).join("\n"),
  } satisfies ToolResult;
};

const updatePage = (id: number, data: Record<string, unknown>, extra = {}) =>
  callTool("updateDocument", { data, id, slug: "pages", ...extra });

const updateFolder = (id: number, data: Record<string, unknown>, extra = {}) =>
  callTool("updateDocument", { data, id, slug: "folders", ...extra });

const readPage = async (payload: Payload, id: number): Promise<PageState & { title: string }> => {
  const page = (await payload.findByID({
    collection: "pages",
    depth: 0,
    id,
    locale: "en",
    overrideAccess: true,
  })) as unknown as {
    folder: number | null;
    fullPath: string;
    orderKey: string;
    structureRevision: number;
    title: string;
  };

  return {
    folder: page.folder,
    fullPath: page.fullPath,
    orderKey: page.orderKey,
    revision: page.structureRevision,
    title: page.title,
  };
};

type FolderState = {
  name: Record<string, string | null>;
  orderKey: string;
  parent: number | null;
  slug: Record<string, string | null>;
  structureRevision: number;
};

const readFolder = async (payload: Payload, id: number): Promise<FolderState> =>
  (await payload.findByID({
    collection: "folders",
    depth: 0,
    id,
    locale: "all",
    overrideAccess: true,
  })) as unknown as FolderState;

const expectRefusal = (result: ToolResult, field: string) => {
  expect(result.isError).toBe(true);
  expect(result.text).toContain(`"${field}" cannot be changed through MCP updateDocument`);
  expect(result.text).toContain("Nothing was saved.");
  expect(result.text).not.toContain("previewMove");
  expect(result.text).not.toContain("applyTreeChange");
};

describe("MCP updateDocument on a page", () => {
  it("refuses a move, names what to do instead and saves nothing", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    const result = await updatePage(page.id, { folder: guides.id }, { returning: false });

    expectRefusal(result, "folder");
    expect(result.text).toContain("POST /api/folders-tree/move");
    expect(result.text).toContain("every language");
    expect(await readPage(payload, page.id)).toEqual(before);
    expect(before.folder).toBe(products.id);
    expect(before.fullPath).toBe("/products/gift-cards");
  });

  it("refuses a move to the top level", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });

    const result = await updatePage(page.id, { folder: null });

    expectRefusal(result, "folder");
    expect((await readPage(payload, page.id)).folder).toBe(products.id);
  });

  it("refuses a changed orderKey and a changed structureRevision", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    expectRefusal(await updatePage(page.id, { orderKey: "zz" }), "orderKey");
    expectRefusal(
      await updatePage(page.id, { structureRevision: before.revision + 5 }),
      "structureRevision"
    );
    expect(await readPage(payload, page.id)).toEqual(before);
  });

  it("passes when the stored structure is sent back with a new title", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    const before = await readPage(payload, page.id);

    const result = await updatePage(
      page.id,
      {
        folder: products.id,
        orderKey: before.orderKey,
        structureRevision: before.revision,
        title: "Gift cards, renamed",
      },
      { locale: "en" }
    );

    expect(result.isError).toBe(false);
    expect(result.text).toContain("Document updated successfully");
    expect(await readPage(payload, page.id)).toEqual({
      ...before,
      title: "Gift cards, renamed",
    });
  });

  it("passes a page from before the plugin that is echoed back with a null structureRevision", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    await payload.db.updateOne({
      collection: "pages",
      data: { structureRevision: null },
      id: page.id,
      returning: false,
    });
    const before = await readPage(payload, page.id);

    const result = await updatePage(
      page.id,
      {
        folder: products.id,
        orderKey: before.orderKey,
        structureRevision: null,
        title: "Gift cards, renamed",
      },
      { locale: "en" }
    );

    expect(result.isError).toBe(false);
    expect(result.text).toContain("Document updated successfully");
    expect((await readPage(payload, page.id)).title).toBe("Gift cards, renamed");
  });

  it("still refuses a null structureRevision on a page that has been moved", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });
    await payload.db.updateOne({
      collection: "pages",
      data: { structureRevision: 3 },
      id: page.id,
      returning: false,
    });

    expectRefusal(await updatePage(page.id, { structureRevision: null }), "structureRevision");
  });

  it("refuses a bulk update that names the folder, through the page bulk guard", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const guides = await createFolder(payload, { slug: "guides" });
    const page = await createPage(payload, { folder: products.id, slug: "gift-cards" });

    const result = await callTool("updateDocument", {
      data: { folder: guides.id },
      slug: "pages",
      where: { id: { equals: page.id } },
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("several pages at once is not supported");
    expect((await readPage(payload, page.id)).folder).toBe(products.id);
  });
});

describe("MCP updateDocument on a folder", () => {
  const createCompany = async (payload: Payload) => {
    const company = await createFolder(payload, { name: "Company", slug: "company" });
    await payload.update({
      collection: "folders",
      data: { name: "Firma", slug: "firma" },
      depth: 0,
      id: company.id,
      locale: "de",
      overrideAccess: true,
    });

    return company;
  };

  it("refuses a slug change in the default locale and saves nothing", async () => {
    const { payload } = harness;
    const company = await createCompany(payload);
    const before = await readFolder(payload, company.id);

    const result = await updateFolder(company.id, { slug: "team" });

    expectRefusal(result, "slug");
    expect(result.text).toContain("/api/folders-tree/folders/:id/preview");
    expect(await readFolder(payload, company.id)).toEqual(before);
  });

  it("passes a name-only change", async () => {
    const { payload } = harness;
    const company = await createCompany(payload);

    const result = await updateFolder(company.id, { name: "Team" });

    expect(result.isError).toBe(false);
    const after = await readFolder(payload, company.id);
    expect(after.name.en).toBe("Team");
    expect(after.slug).toEqual({ de: "firma", en: "company" });
  });

  it("refuses a slug change in a non-default locale", async () => {
    const { payload } = harness;
    const company = await createCompany(payload);
    const before = await readFolder(payload, company.id);

    const result = await updateFolder(company.id, { slug: "unternehmen" }, { locale: "de" });

    expectRefusal(result, "slug");
    expect(await readFolder(payload, company.id)).toEqual(before);
  });

  it("passes the stored slug sent back in a non-default locale, with a new name", async () => {
    const { payload } = harness;
    const company = await createCompany(payload);

    const result = await updateFolder(
      company.id,
      { name: "Unternehmen", slug: "firma" },
      { locale: "de" }
    );

    expect(result.isError).toBe(false);
    const after = await readFolder(payload, company.id);
    expect(after.name.de).toBe("Unternehmen");
    expect(after.slug).toEqual({ de: "firma", en: "company" });
  });

  it("does not store the fallback slug as the locale's own when an agent echoes it back", async () => {
    const { payload } = harness;
    const company = await createFolder(payload, { name: "Company", slug: "company" });
    expect((await readFolder(payload, company.id)).slug.de ?? null).toBeNull();

    const result = await updateFolder(
      company.id,
      { name: "Unternehmen", slug: "company" },
      { locale: "de" }
    );

    expect(result.isError).toBe(false);
    const after = await readFolder(payload, company.id);
    expect(after.name.de).toBe("Unternehmen");
    expect(after.slug.de ?? null).toBeNull();
    expect(after.slug.en).toBe("company");
  });

  // plugin-mcp's own input check (`data.slug: expected string`) refuses an object slug before any
  // hook runs, so `locale: "all"` with a slug object cannot arrive through the real tool in
  // 4.0.0-beta.5. These two calls mark a Local API request as MCP themselves to reach the hook's
  // per-locale comparison, which matters if a host swaps the tool or a later plugin-mcp accepts it.
  const updateAllLocalesAsMcp = async (id: number, data: Record<string, unknown>) => {
    const req = await createTestRequest(harness.payload);
    (req as { payloadAPI: string }).payloadAPI = "MCP";

    return harness.payload.update({
      collection: "folders",
      data: data as never,
      depth: 0,
      id,
      locale: "all" as never,
      overrideAccess: true,
      req,
    });
  };

  it("refuses a locale all slug object that changes one locale", async () => {
    const { payload } = harness;
    const company = await createCompany(payload);
    const before = await readFolder(payload, company.id);

    await expect(
      updateAllLocalesAsMcp(company.id, { slug: { de: "unternehmen", en: "company" } })
    ).rejects.toMatchObject({
      data: { field: "slug", reason: "mcp-slug-change" },
      message: expect.stringContaining('"slug" cannot be changed through MCP updateDocument'),
      status: 400,
    });
    expect(await readFolder(payload, company.id)).toEqual(before);
  });

  it("passes a locale all slug object whose values are unchanged", async () => {
    const { payload } = harness;
    const company = await createCompany(payload);

    await updateAllLocalesAsMcp(company.id, {
      name: { de: "Firma 2", en: "Company 2" },
      slug: { de: "firma", en: "company" },
    });

    const after = await readFolder(payload, company.id);
    expect(after.name).toEqual({ de: "Firma 2", en: "Company 2" });
    expect(after.slug).toEqual({ de: "firma", en: "company" });
  });

  it("refuses a parent change, and passes the stored parent sent back", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const other = await createFolder(payload, { slug: "other" });
    const guides = await createFolder(payload, { parent: products.id, slug: "guides" });
    const before = await readFolder(payload, guides.id);

    expectRefusal(await updateFolder(guides.id, { parent: other.id }), "parent");
    expectRefusal(await updateFolder(guides.id, { parent: null }), "parent");
    expect(await readFolder(payload, guides.id)).toEqual(before);

    const sameParent = await updateFolder(guides.id, { name: "Guides 2", parent: products.id });

    expect(sameParent.isError).toBe(false);
    const after = await readFolder(payload, guides.id);
    expect(after.parent).toBe(products.id);
    expect(after.name.en).toBe("Guides 2");
  });

  it("refuses a changed orderKey and structureRevision", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const before = await readFolder(payload, products.id);

    expectRefusal(await updateFolder(products.id, { orderKey: "zz" }), "orderKey");
    expectRefusal(
      await updateFolder(products.id, { structureRevision: before.structureRevision + 3 }),
      "structureRevision"
    );
    expect(await readFolder(payload, products.id)).toEqual(before);
  });

  it("refuses a bulk update that names parent, and one that names slug", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });
    const other = await createFolder(payload, { slug: "other" });
    const guides = await createFolder(payload, { parent: products.id, slug: "guides" });
    const before = await readFolder(payload, guides.id);

    const moved = await callTool("updateDocument", {
      data: { parent: other.id },
      slug: "folders",
      where: { id: { equals: guides.id } },
    });
    const renamed = await callTool("updateDocument", {
      data: { slug: "manuals" },
      slug: "folders",
      where: { id: { equals: guides.id } },
    });
    // Even the stored value is refused: a bulk update has no single stored value to compare with.
    const sameParent = await callTool("updateDocument", {
      data: { parent: products.id },
      slug: "folders",
      where: { id: { equals: guides.id } },
    });

    expectRefusal(moved, "parent");
    expectRefusal(renamed, "slug");
    expectRefusal(sameParent, "parent");
    expect(await readFolder(payload, guides.id)).toEqual(before);
  });

  it("passes a bulk update of other fields", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { slug: "products" });

    const result = await callTool("updateDocument", {
      data: { name: "Everything" },
      slug: "folders",
      where: { id: { equals: products.id } },
    });

    expect(result.isError).toBe(false);
    expect((await readFolder(payload, products.id)).name.en).toBe("Everything");
  });
});
