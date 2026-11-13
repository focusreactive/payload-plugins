import type { Access, Payload } from "payload";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { callMcpTool, listMcpTools } from "../helpers/mcpClient.js";
import { clearTree } from "../helpers/seedTree.js";

/**
 * The seeded tree, in en (default) and de:
 *
 * - Company / Unternehmen, a folder translated in both languages, holding
 *   - Archive, a folder with an en name and slug only: de falls back to both
 *   - About Us / Über uns, a page published in both languages
 *   - Contact, a page saved in en only: de shows it through fallback
 *   - Neuigkeit, a page published in de and never in en: its en side is an empty draft
 *   - Secret, a post the editor may not read
 * - Products / Produkte, a second top-level folder
 */
type Seeded = {
  about: { id: number };
  archive: { id: number };
  company: { id: number };
  contact: { id: number };
  news: { id: number };
  products: { id: number };
  secret: { id: number };
};

type Row = {
  childCount?: number;
  collection: string;
  fallbackIn: { label: string[]; slug: string[] };
  fullPath: Record<string, string | null>;
  id: number;
  isFolderRoot: boolean;
  kind: "folder" | "page";
  name?: Record<string, string | null>;
  slug: Record<string, string | null>;
  status: Record<string, string | null> | null;
  title?: Record<string, string | null>;
};

type Browse = {
  ancestors: Row[];
  defaultLocale: string;
  folder: Row | null;
  hasMore: boolean;
  locales: string[];
  rows: Row[];
};

const editor = { email: "mcp-editor@example.com", password: "test-password" };

const hideSecretFrom =
  (email: string): Access =>
  ({ req }) =>
    req.user?.email === email ? { slug: { not_equals: "secret" } } : true;

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({ mcp: true });
  await harness.payload.create({
    collection: "users",
    data: { ...editor, role: "editor" } as never,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const seedTree = async (payload: Payload): Promise<Seeded> => {
  const create = (
    collection: "folders" | "pages" | "posts",
    data: Record<string, unknown>,
    extra = {}
  ) =>
    payload.create({
      collection,
      data: data as never,
      depth: 0,
      overrideAccess: true,
      ...extra,
    }) as unknown as Promise<{ id: number }>;
  const company = await create(
    "folders",
    {
      name: { de: "Unternehmen", en: "Company" },
      slug: { de: "unternehmen", en: "company" },
    },
    { locale: "all" }
  );
  const archive = await create("folders", {
    name: "Archive",
    parent: company.id,
    slug: "archive",
  });
  const about = await create(
    "pages",
    {
      _status: "published",
      folder: company.id,
      slug: { de: "ueber-uns", en: "about-us" },
      title: { de: "Über uns", en: "About Us" },
    },
    { locale: "all" }
  );
  const contact = await create("pages", {
    _status: "published",
    folder: company.id,
    slug: "contact",
    title: "Contact",
  });
  const news = await create(
    "pages",
    {
      _status: "draft",
      folder: company.id,
      slug: { de: "neuigkeit", en: "news" },
      title: { de: "Neuigkeit", en: "News" },
    },
    { draft: true, locale: "all" }
  );
  await payload.update({
    collection: "pages",
    data: { _status: "published" } as never,
    id: news.id,
    locale: "de",
    overrideAccess: true,
  });
  const secret = await create("posts", { folder: company.id, slug: "secret", title: "Secret" });
  const products = await create(
    "folders",
    {
      name: { de: "Produkte", en: "Products" },
      slug: { de: "produkte", en: "products" },
    },
    { locale: "all" }
  );

  return { about, archive, company, contact, news, products, secret };
};

let tree: Seeded;

beforeEach(async () => {
  tree = await seedTree(harness.payload);
});

const browse = async (
  toolArguments: Record<string, unknown> = {},
  user?: { email: string; password: string }
) => {
  const result = await callMcpTool(harness, "browseTree", toolArguments, user);
  expect(result.isError).toBe(false);

  return { data: result.structuredContent as Browse, text: result.text };
};

const rowOf = (data: Browse, id: number, collection: string) =>
  data.rows.find((row) => row.id === id && row.collection === collection) as Row;

describe("browseTree at the top level", () => {
  it("lists the site's locales and the top-level folders with both languages", async () => {
    const { data, text } = await browse();

    expect(data.locales).toEqual(["en", "de"]);
    expect(data.defaultLocale).toBe("en");
    expect(data.folder).toBeNull();
    expect(data.ancestors).toEqual([]);
    expect(data.hasMore).toBe(false);
    const company = rowOf(data, tree.company.id, "folders");
    expect(company).toMatchObject({
      childCount: 5,
      fullPath: { de: "/unternehmen", en: "/company" },
      kind: "folder",
      name: { de: "Unternehmen", en: "Company" },
      slug: { de: "unternehmen", en: "company" },
      status: null,
    });
    expect(rowOf(data, tree.products.id, "folders").name).toEqual({
      de: "Produkte",
      en: "Products",
    });
    expect(text).toContain("Languages: en (default), de.");
    expect(text).toContain('de: "Unternehmen" at /unternehmen');
  });
});

describe("browseTree inside a folder", () => {
  it("gives every row its name, slug and path in each language", async () => {
    const { data } = await browse({ folder: tree.company.id });

    expect(data.folder).toMatchObject({ id: tree.company.id, name: { de: "Unternehmen" } });
    expect(data.ancestors).toEqual([]);
    expect(data.rows.map((row) => `${row.collection}:${row.id}`).sort()).toEqual(
      [
        `folders:${tree.archive.id}`,
        `pages:${tree.about.id}`,
        `pages:${tree.contact.id}`,
        `pages:${tree.news.id}`,
        `posts:${tree.secret.id}`,
      ].sort()
    );
    expect(rowOf(data, tree.about.id, "pages")).toMatchObject({
      fullPath: { de: "/unternehmen/ueber-uns", en: "/company/about-us" },
      slug: { de: "ueber-uns", en: "about-us" },
      title: { de: "Über uns", en: "About Us" },
    });
  });

  it("names the folders above a nested folder, root-most first", async () => {
    const { data } = await browse({ folder: tree.archive.id });

    expect(data.ancestors.map((row) => row.id)).toEqual([tree.company.id]);
    expect(data.ancestors[0].name).toEqual({ de: "Unternehmen", en: "Company" });
    expect(data.folder?.id).toBe(tree.archive.id);
    expect(data.rows).toEqual([]);
  });

  it("marks a name and a slug a language does not have of its own as fallback", async () => {
    const { data, text } = await browse({ folder: tree.company.id });

    const archive = rowOf(data, tree.archive.id, "folders");
    expect(archive.name).toEqual({ de: "Archive", en: "Archive" });
    expect(archive.fallbackIn).toEqual({ label: ["de"], slug: ["de"] });
    expect(archive.fullPath.de).toBe("/unternehmen/archive");
    expect(rowOf(data, tree.about.id, "pages").fallbackIn).toEqual({ label: [], slug: [] });
    expect(text).toContain('de: "Archive" (default language\'s text) at /unternehmen/archive');
  });

  it("says per language whether a page is published, a draft, or live through fallback", async () => {
    const { data, text } = await browse({ folder: tree.company.id });

    expect(rowOf(data, tree.about.id, "pages").status).toEqual({
      de: "published",
      en: "published",
    });
    expect(rowOf(data, tree.contact.id, "pages").status).toEqual({
      de: "fallback",
      en: "published",
    });
    expect(text).toContain("published through the default language");
  });

  it("shows a value only German has: the de title and path exist, the en side is an empty draft", async () => {
    const { data } = await browse({ folder: tree.company.id });

    const news = rowOf(data, tree.news.id, "pages");
    expect(news.title?.de).toBe("Neuigkeit");
    expect(news.fullPath.de).toBe("/unternehmen/neuigkeit");
    expect(news.status).toEqual({ de: "published", en: "draft" });
    expect(news.fullPath.en).toBe("");
    expect(news.title?.en).not.toBe("Neuigkeit");
  });

  it("lists only one collection when asked", async () => {
    const pages = await browse({ collection: "pages", folder: tree.company.id });
    const folders = await browse({ collection: "folders", folder: tree.company.id });

    expect(new Set(pages.data.rows.map((row) => row.collection))).toEqual(new Set(["pages"]));
    expect(pages.data.rows).toHaveLength(3);
    expect(folders.data.rows.map((row) => row.id)).toEqual([tree.archive.id]);
  });

  it("refuses an unknown folder with a message and says nothing about whether it exists", async () => {
    const result = await callMcpTool(harness, "browseTree", { folder: 99_999 });

    expect(result.isError).toBe(true);
    expect(result.text).toBe("Folder 99999 was not found, or you may not read it.");
  });
});

describe("browseTree search", () => {
  it("finds a folder by its German name and still gives the English side", async () => {
    const { data, text } = await browse({ search: "Unternehmen" });

    expect(data.rows.map((row) => row.id)).toContain(tree.company.id);
    const company = rowOf(data, tree.company.id, "folders");
    expect(company.name).toEqual({ de: "Unternehmen", en: "Company" });
    expect(company.fullPath.en).toBe("/company");
    expect(text).toContain('Search for "Unternehmen" in the top level');
  });

  it("finds a page by its German title and fills in the English side", async () => {
    // Only the German title contains "uns", so the English side comes from a second read.
    const { data } = await browse({ search: "uns" });

    const about = rowOf(data, tree.about.id, "pages");
    expect(about.title).toEqual({ de: "Über uns", en: "About Us" });
    expect(about.fullPath).toEqual({ de: "/unternehmen/ueber-uns", en: "/company/about-us" });
  });

  it("finds a page that only German has a title for", async () => {
    const { data } = await browse({ search: "Neuigkeit" });

    const news = rowOf(data, tree.news.id, "pages");
    expect(news.title?.de).toBe("Neuigkeit");
    expect(news.status).toEqual({ de: "published", en: "draft" });
  });

  it("searches inside the folder given and narrows to one collection", async () => {
    const inside = await browse({ folder: tree.company.id, search: "us" });
    const onlyFolders = await browse({ collection: "folders", search: "archive" });

    expect(inside.data.rows.map((row) => row.id)).toContain(tree.about.id);
    expect(inside.data.folder?.id).toBe(tree.company.id);
    expect(onlyFolders.data.rows.map((row) => row.id)).toEqual([tree.archive.id]);
  });

  it("returns no rows for text nothing contains", async () => {
    const { data, text } = await browse({ search: "zzz-no-such-thing" });

    expect(data.rows).toEqual([]);
    expect(text).toContain("0 rows");
  });
});

describe("browseTree and the user's own access", () => {
  it("leaves out a document the user may not read, in a listing and in a search", async () => {
    const { config } = harness.payload.collections.posts;
    const originalRead = config.access.read;
    config.access.read = hideSecretFrom(editor.email);
    try {
      const asEditor = await browse({ folder: tree.company.id }, editor);
      const found = await browse({ search: "secret" }, editor);
      const asAdmin = await browse({ folder: tree.company.id });

      expect(asEditor.data.rows.some((row) => row.collection === "posts")).toBe(false);
      expect(asEditor.data.rows).toHaveLength(4);
      expect(found.data.rows).toEqual([]);
      expect(asAdmin.data.rows.some((row) => row.collection === "posts")).toBe(true);
    } finally {
      config.access.read = originalRead;
    }
  });
});

describe("browseTree as a tool", () => {
  it("tells the model it shows every language, and lists the collections it can filter by", async () => {
    const tool = (await listMcpTools(harness)).find(({ name }) => name === "browseTree");

    expect(tool?.description).toContain("every language");
    expect(tool?.description).toContain("fallback");
    expect(tool?.description).not.toMatch(/[–—]/u);
    const inputSchema = tool?.inputSchema as {
      properties: Record<string, { enum?: string[] }>;
    };
    const { properties } = inputSchema;
    expect(Object.keys(properties).sort()).toEqual(["collection", "folder", "search"]);
    expect(properties.collection.enum).toEqual(["folders", "pages", "posts"]);
  });

  it("is switched off by mcp.tools.browseTree: false", async () => {
    const quiet = await getTestPayload({
      foldersOptions: { mcp: { tools: { browseTree: false } } },
      mcp: true,
    });
    try {
      expect((await listMcpTools(quiet)).map(({ name }) => name)).not.toContain("browseTree");
    } finally {
      await quiet.destroy();
    }
  });
});

describe("browseTree on a site without localization", () => {
  it("keeps one shape: the single language is keyed with a dash", async () => {
    const plain = await getTestPayload({ localized: false, mcp: true });
    try {
      await plain.payload.create({
        collection: "folders",
        data: { name: "Guides", slug: "guides" } as never,
        overrideAccess: true,
      });
      const result = await callMcpTool(plain, "browseTree");
      const data = result.structuredContent as Browse;

      expect(data.locales).toEqual(["-"]);
      expect(data.defaultLocale).toBe("-");
      expect(data.rows[0]).toMatchObject({
        fullPath: { "-": "/guides" },
        name: { "-": "Guides" },
        slug: { "-": "guides" },
      });
      expect(result.text).toContain("one language");
    } finally {
      await clearTree(plain.payload);
      await plain.destroy();
    }
  });
});
