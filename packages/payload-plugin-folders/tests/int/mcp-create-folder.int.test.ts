import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { callMcpTool, listMcpTools } from "../helpers/mcpClient.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage } from "../helpers/treeFixtures.js";

type Created = {
  fallingBack: Array<{ fullPath: string; locale: string }>;
  fullPath: Record<string, string>;
  id: number;
  name: Record<string, string | null>;
  parent: number | null;
};

type StoredFolder = {
  fullPath: Record<string, string>;
  name: Record<string, string | null>;
  parent: number | null;
  slug: Record<string, string | null>;
};

const limitedEditor = { email: "limited-editor@example.com", password: "test-password" };

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

const readStored = (payload: Payload, id: number) =>
  payload.findByID({
    collection: "folders",
    depth: 0,
    id,
    locale: "all" as never,
    overrideAccess: true,
  }) as unknown as Promise<StoredFolder>;

const countFolders = async (payload: Payload) =>
  (await payload.count({ collection: "folders", overrideAccess: true })).totalDocs;

const create = async (
  toolArguments: Record<string, unknown>,
  user?: { email: string; password: string }
) => callMcpTool(harness, "createFolder", toolArguments, user);

const createdFrom = (result: Awaited<ReturnType<typeof create>>): Created => {
  expect(result.isError).toBe(false);

  return result.structuredContent as Created;
};

describe("createFolder with every language given", () => {
  it("writes the folder whole, with each language's name and path", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { name: "Products", slug: "products" });

    const result = await create({
      name: { de: "Ratgeber", en: "Guides" },
      parent: products.id,
    });

    const created = createdFrom(result);
    expect(created.fullPath).toEqual({ de: "/products/ratgeber", en: "/products/guides" });
    expect(created.name).toEqual({ de: "Ratgeber", en: "Guides" });
    expect(created.fallingBack).toEqual([]);
    expect(created.parent).toBe(products.id);
    const stored = await readStored(payload, created.id);
    expect(stored.name).toEqual({ de: "Ratgeber", en: "Guides" });
    expect(stored.slug).toEqual({ de: "ratgeber", en: "guides" });
    expect(stored.parent).toBe(products.id);
    expect(result.text).toContain(`Created folder ${created.id} "Guides"`);
    expect(result.text).toContain("de /products/ratgeber");
  });

  it("takes a slug per language when one is given", async () => {
    const result = await create({
      name: { de: "Ratgeber", en: "Guides" },
      slug: { de: "hilfe", en: "help" },
    });

    expect(createdFrom(result).fullPath).toEqual({ de: "/hilfe", en: "/help" });
  });
});

describe("createFolder with the default language only", () => {
  it("creates it and lists the languages that fall back, with the path each shows", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, {
      name: "Products",
      slug: "products",
    });
    await payload.update({
      collection: "folders",
      data: { name: "Produkte", slug: "produkte" },
      id: products.id,
      locale: "de",
      overrideAccess: true,
    });

    const result = await create({ name: { en: "Guides" }, parent: products.id });

    const created = createdFrom(result);
    expect(created.fullPath).toEqual({ de: "/produkte/guides", en: "/products/guides" });
    expect(created.name).toEqual({ de: null, en: "Guides" });
    expect(created.fallingBack).toEqual([{ fullPath: "/produkte/guides", locale: "de" }]);
    const stored = await readStored(payload, created.id);
    expect(stored.name.de).toBeNull();
    expect(result.text).toContain("de has no name of its own");
    expect(result.text).toContain("ask for it");
  });
});

describe("createFolder refuses before it writes", () => {
  it("refuses a taken path in the default language and writes nothing", async () => {
    const { payload } = harness;
    await createFolder(payload, { name: "Guides", slug: "guides" });
    const before = await countFolders(payload);

    const result = await create({ name: { en: "Guides" } });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("/guides is already used by a folder");
    expect(result.text).toContain("Nothing was created.");
    expect(await countFolders(payload)).toBe(before);
  });

  it("refuses a path taken in German only, and names the language", async () => {
    const { payload } = harness;
    const taken = await createFolder(payload, { name: "Help", slug: "help" });
    await payload.update({
      collection: "folders",
      data: { name: "Ratgeber", slug: "ratgeber" },
      id: taken.id,
      locale: "de",
      overrideAccess: true,
    });
    const before = await countFolders(payload);

    const result = await create({ name: { de: "Ratgeber", en: "Guides" } });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("de: /ratgeber is already used by a folder");
    expect(await countFolders(payload)).toBe(before);
  });

  it("refuses a path a page already holds", async () => {
    const { payload } = harness;
    await createPage(payload, { slug: "guides" });
    const before = await countFolders(payload);

    const result = await create({ name: { en: "Guides" } });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("/guides is already used by");
    expect(await countFolders(payload)).toBe(before);
  });

  it("refuses a missing default-language name and a folder that does not exist", async () => {
    const { payload } = harness;
    const before = await countFolders(payload);

    const noName = await create({ name: { de: "Ratgeber", en: "   " } });
    const noParent = await create({ name: { en: "Guides" }, parent: 99_999 });

    expect(noName.isError).toBe(true);
    expect(noName.text).toContain("default language (en)");
    expect(noParent.isError).toBe(true);
    expect(noParent.text).toContain("This folder no longer exists");
    expect(await countFolders(payload)).toBe(before);
  });
});

describe("createFolder and the user's own access", () => {
  it("refuses a user who may not create there and writes nothing", async () => {
    const { payload } = harness;
    const own = await createFolder(payload, { name: "Own", slug: "own" });
    await payload.create({
      collection: "users",
      data: { ...limitedEditor, limitedFolder: own.id, role: "editorLimited" } as never,
      overrideAccess: true,
    });
    const before = await countFolders(payload);

    const refused = await create({ name: { en: "Guides" } }, limitedEditor);
    const allowed = await create({ name: { en: "Guides" }, parent: own.id }, limitedEditor);

    expect(refused.isError).toBe(true);
    expect(refused.text).toContain("not allowed");
    expect(await countFolders(payload)).toBe(before + (allowed.isError ? 0 : 1));
    expect(allowed.isError).toBe(false);
  });
});

describe("createFolder as a tool", () => {
  it("lists the site's languages in its input and tells the model to ask for each", async () => {
    const tool = (await listMcpTools(harness)).find(({ name }) => name === "createFolder");

    expect(tool?.description).toContain("Ask the user for the name in each language");
    expect(tool?.description).toContain("fallback");
    expect(tool?.description).not.toMatch(/[–—]/u);
    const schema = tool?.inputSchema as {
      properties: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
      required: string[];
    };
    expect(Object.keys(schema.properties.name.properties ?? {})).toEqual(["en", "de"]);
    expect(schema.properties.name.required).toEqual(["en"]);
    expect(Object.keys(schema.properties.slug.properties ?? {})).toEqual(["en", "de"]);
    expect(schema.required).toEqual(["name"]);
  });
});

describe("createFolder on a site without localization", () => {
  it("keeps one shape: the single language is keyed with a dash", async () => {
    const plain = await getTestPayload({ localized: false, mcp: true });
    try {
      const tool = (await listMcpTools(plain)).find(({ name }) => name === "createFolder");
      const schema = tool?.inputSchema as {
        properties: { name: { properties: Record<string, unknown>; required: string[] } };
      };
      expect(Object.keys(schema.properties.name.properties)).toEqual(["-"]);

      const result = await callMcpTool(plain, "createFolder", { name: { "-": "Guides" } });

      const created = result.structuredContent as Created;
      expect(result.isError).toBe(false);
      expect(created.fullPath).toEqual({ "-": "/guides" });
      expect(created.fallingBack).toEqual([]);
    } finally {
      await clearTree(plain.payload);
      await plain.destroy();
    }
  });
});
