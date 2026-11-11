import type { Access } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { seedGiftCardTree } from "../helpers/giftCardTree.js";
import type { GiftCardTree } from "../helpers/giftCardTree.js";
import { callMcpTool, listMcpTools } from "../helpers/mcpClient.js";
import { clearTree } from "../helpers/seedTree.js";

type Example = { from: string; locale: string; to: string };

type Preview = {
  askUser: string[];
  blocked?: Array<{ item: { collection: string; id: number }; message: string; reason: string }>;
  confirmationToken?: string;
  draftOnlyPages: number;
  examples: Example[];
  expiresInSeconds?: number;
  needsConfirmation: boolean;
  ok: boolean;
  publishedUrlChanges: { byLocale: Record<string, number>; total: number };
  redirects: { enabled: boolean; redirectsPluginRows: number; rowsToWrite: number };
  summary: string;
};

const drafter = { email: "mcp-drafter@example.com", password: "test-password" };
const editor = { email: "mcp-move-editor@example.com", password: "test-password" };

let harness: TestPayload;
let tree: GiftCardTree;

beforeAll(async () => {
  harness = await getTestPayload({ mcp: true });
  for (const [user, role] of [
    [drafter, "drafter"],
    [editor, "editor"],
  ] as const) {
    await harness.payload.create({
      collection: "users",
      data: { ...user, role } as never,
      overrideAccess: true,
    });
  }
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const preview = (toolArguments: Record<string, unknown>, user?: typeof editor) =>
  callMcpTool(harness, "previewMove", toolArguments, user);

const previewOf = (result: Awaited<ReturnType<typeof preview>>): Preview =>
  result.structuredContent as Preview;

const createPage = (data: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  harness.payload.create({
    collection: "pages",
    data: data as never,
    depth: 0,
    overrideAccess: true,
    ...extra,
  }) as unknown as Promise<{ id: number }>;

const decodeToken = (token: string) =>
  JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf-8")) as {
    expiresAt: number;
    kind: string;
    request: {
      items: Array<{
        collection: string;
        expected?: { orderKey: string | null; parentId: number | null };
        id: number;
      }>;
      redirects: boolean;
      toFolder?: number | null;
    };
    user: { collection: string; id: number };
    version: number;
  };

describe("previewMove for a published page in two languages", () => {
  it("counts the URL changes per language with examples, and asks the user", async () => {
    tree = await seedGiftCardTree(harness.payload);

    const result = await preview({
      items: [{ collection: "pages", id: tree.giftCards.id }],
      toFolder: tree.guides.id,
    });

    expect(result.isError).toBe(false);
    const data = previewOf(result);
    expect(data.ok).toBe(true);
    expect(data.summary).toBe(
      "2 published URLs will change across 2 languages. The old URLs will redirect to the new ones."
    );
    expect(data.needsConfirmation).toBe(true);
    expect(data.publishedUrlChanges).toEqual({ byLocale: { de: 1, en: 1 }, total: 2 });
    expect(data.draftOnlyPages).toBe(0);
    expect(data.examples).toEqual([
      { from: "/products/gift-cards", locale: "en", to: "/products/guides/gift-cards" },
      { from: "/produkte/gift-cards", locale: "de", to: "/produkte/guides/gift-cards" },
    ]);
    expect(data.redirects).toEqual({ enabled: true, redirectsPluginRows: 0, rowsToWrite: 2 });
    expect(data.expiresInSeconds).toBe(900);
    expect(data.askUser).toHaveLength(2);
    expect(data.askUser[0]).toContain("Gift Cards");
    expect(data.askUser[0]).toContain("English and German");
    expect(data.askUser[0]).toContain("/products/guides");
    expect(data.askUser[0]).toContain("/products/gift-cards");
    expect(data.askUser[1]).toContain("Redirect the old URLs");
    expect(result.text).toContain(data.summary);
    expect(result.text).toContain("/produkte/gift-cards");
    expect(result.text).toContain(data.confirmationToken as string);
  });

  it("writes nothing", async () => {
    tree = await seedGiftCardTree(harness.payload);

    await preview({
      items: [{ collection: "pages", id: tree.giftCards.id }],
      toFolder: tree.guides.id,
    });

    const page = await harness.payload.findByID({
      collection: "pages",
      depth: 0,
      id: tree.giftCards.id,
      overrideAccess: true,
    });
    expect(page.folder).toBe(tree.products.id);
    const redirects = await harness.payload.count({
      collection: "folder-redirects",
      overrideAccess: true,
    });
    expect(redirects.totalDocs).toBe(0);
  });

  it("records each item's current folder and order key in the token, for the user who asked", async () => {
    tree = await seedGiftCardTree(harness.payload);

    const data = previewOf(
      await preview({
        items: [{ collection: "pages", id: tree.giftCards.id }],
        toFolder: tree.guides.id,
      })
    );

    const body = decodeToken(data.confirmationToken as string);
    expect(body.version).toBe(1);
    expect(body.kind).toBe("move");
    expect(body.user.collection).toBe("users");
    expect(body.request.toFolder).toBe(tree.guides.id);
    expect(body.request.redirects).toBe(true);
    expect(body.request.items).toEqual([
      {
        collection: "pages",
        expected: { orderKey: expect.any(String), parentId: tree.products.id },
        id: tree.giftCards.id,
      },
    ]);
    expect(body.expiresAt).toBeGreaterThan(Date.now());
  });

  it("shows at most three examples per language and counts every change", async () => {
    tree = await seedGiftCardTree(harness.payload);
    const pageIds = [tree.giftCards.id];
    for (const slug of ["one", "two", "three", "four"]) {
      pageIds.push(
        (
          await createPage({
            _status: "published",
            folder: tree.products.id,
            slug,
            title: slug,
          })
        ).id
      );
    }

    const data = previewOf(
      await preview({
        items: pageIds.map((id) => ({ collection: "pages", id })),
        toFolder: tree.guides.id,
      })
    );

    expect(data.publishedUrlChanges.byLocale.en).toBe(5);
    expect(data.publishedUrlChanges.total).toBeGreaterThanOrEqual(5);
    expect(data.examples.filter((example) => example.locale === "en")).toHaveLength(3);
    expect(data.examples.filter((example) => example.locale === "de").length).toBeLessThanOrEqual(
      3
    );
  });

  it("leaves redirects out of the plan and the summary when the caller turns them off", async () => {
    tree = await seedGiftCardTree(harness.payload);

    const data = previewOf(
      await preview({
        items: [{ collection: "pages", id: tree.giftCards.id }],
        redirects: false,
        toFolder: tree.guides.id,
      })
    );

    expect(data.redirects.enabled).toBe(false);
    expect(data.redirects.rowsToWrite).toBe(0);
    expect(data.summary).toContain("will not redirect");
    expect(decodeToken(data.confirmationToken as string).request.redirects).toBe(false);
  });
});

describe("previewMove when no published URL changes", () => {
  it("needs no confirmation for a draft-only page, and still gives a token", async () => {
    tree = await seedGiftCardTree(harness.payload);
    const draftPage = await createPage(
      {
        _status: "draft",
        folder: tree.products.id,
        slug: { de: "entwurf", en: "draft-page" },
        title: { de: "Entwurf", en: "Draft Page" },
      },
      { draft: true, locale: "all" }
    );

    const data = previewOf(
      await preview({
        items: [{ collection: "pages", id: draftPage.id }],
        toFolder: tree.guides.id,
      })
    );

    expect(data.ok).toBe(true);
    expect(data.needsConfirmation).toBe(false);
    expect(data.publishedUrlChanges).toEqual({ byLocale: {}, total: 0 });
    expect(data.draftOnlyPages).toBe(1);
    expect(data.summary).toBe("No published URL will change. 1 draft page will also move.");
    expect(data.askUser).toEqual([]);
    expect(data.confirmationToken).toEqual(expect.any(String));
  });

  it("needs no confirmation for a reorder inside one folder, and still gives a token", async () => {
    tree = await seedGiftCardTree(harness.payload);
    const other = await createPage({
      _status: "published",
      folder: tree.products.id,
      slug: "other",
      title: "Other",
    });

    const data = previewOf(
      await preview({
        after: { collection: "pages", id: other.id },
        items: [{ collection: "pages", id: tree.giftCards.id }],
      })
    );

    expect(data.ok).toBe(true);
    expect(data.needsConfirmation).toBe(false);
    expect(data.publishedUrlChanges.total).toBe(0);
    expect(data.summary).toBe("Only the order changes. No published URL will change.");
    expect(data.confirmationToken).toEqual(expect.any(String));
  });
});

describe("previewMove for a move the plugin blocks", () => {
  it("refuses a folder moved into its own subfolder, with no token", async () => {
    tree = await seedGiftCardTree(harness.payload);

    const result = await preview({
      items: [{ collection: "folders", id: tree.products.id }],
      toFolder: tree.guides.id,
    });

    expect(result.isError).toBe(true);
    const data = previewOf(result);
    expect(data.ok).toBe(false);
    expect(data.blocked?.[0]).toMatchObject({ reason: "cycle" });
    expect(data.confirmationToken).toBeUndefined();
    expect(result.text).toContain("cannot be moved into itself");
  });

  it("refuses a path that is already taken, and names it", async () => {
    tree = await seedGiftCardTree(harness.payload);
    await createPage({
      _status: "published",
      folder: tree.guides.id,
      slug: "gift-cards",
      title: "Gift Cards Guide",
    });

    const result = await preview({
      items: [{ collection: "pages", id: tree.giftCards.id }],
      toFolder: tree.guides.id,
    });

    const data = previewOf(result);
    expect(result.isError).toBe(true);
    expect(data.ok).toBe(false);
    expect(data.blocked?.[0]).toMatchObject({ reason: "conflict" });
    expect(data.blocked?.[0].message).toContain("/products/guides/gift-cards is already used");
    expect(data.confirmationToken).toBeUndefined();
  });

  it("refuses a malformed request in plain words", async () => {
    tree = await seedGiftCardTree(harness.payload);

    const result = await preview({
      items: [{ collection: "pages", id: tree.giftCards.id }],
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("`toFolder` or `after`");
  });
});

describe("previewMove and the user's own access", () => {
  it("gives a user who may not move the page the plugin's refusal and no token", async () => {
    tree = await seedGiftCardTree(harness.payload);

    const result = await preview(
      { items: [{ collection: "pages", id: tree.giftCards.id }], toFolder: tree.guides.id },
      drafter
    );

    const data = previewOf(result);
    expect(result.isError).toBe(true);
    expect(data.ok).toBe(false);
    expect(data.blocked?.[0]).toMatchObject({
      item: { collection: "pages", id: tree.giftCards.id },
      reason: "forbidden",
    });
    expect(data.confirmationToken).toBeUndefined();
    expect(data.examples).toBeUndefined();
  });

  it("answers for a page the user cannot read as it does for a page that does not exist", async () => {
    tree = await seedGiftCardTree(harness.payload);
    const secret = (await harness.payload.create({
      collection: "posts",
      data: { folder: tree.products.id, slug: "secret", title: "Secret" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const hideSecret: Access = ({ req }) =>
      req.user?.email === editor.email ? { slug: { not_equals: "secret" } } : true;
    const { config } = harness.payload.collections.posts;
    const original = config.access.read;
    config.access.read = hideSecret;
    try {
      const asAdmin = await preview({
        items: [{ collection: "posts", id: secret.id }],
        toFolder: tree.guides.id,
      });
      const hidden = await preview(
        { items: [{ collection: "posts", id: secret.id }], toFolder: tree.guides.id },
        editor
      );
      const missing = await preview(
        { items: [{ collection: "posts", id: 999_999 }], toFolder: tree.guides.id },
        editor
      );

      expect(previewOf(asAdmin).ok).toBe(true);
      expect(previewOf(asAdmin).examples[0].from).toBe("/products/secret");
      expect(hidden.isError).toBe(true);
      expect(
        previewOf(hidden).blocked?.map(({ message, reason }) => ({ message, reason }))
      ).toEqual(previewOf(missing).blocked?.map(({ message, reason }) => ({ message, reason })));
      expect(previewOf(hidden).confirmationToken).toBeUndefined();
      expect(hidden.text).not.toContain("secret");
      expect(JSON.stringify(hidden.structuredContent)).not.toContain("secret");
    } finally {
      config.access.read = original;
    }
  });

  it("keeps a page the user cannot read out of the examples of a folder move", async () => {
    tree = await seedGiftCardTree(harness.payload);
    const archive = (await harness.payload.create({
      collection: "folders",
      data: { name: "Archive", slug: "archive" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    await harness.payload.create({
      collection: "posts",
      data: { folder: tree.products.id, slug: "secret", title: "Secret" },
      depth: 0,
      overrideAccess: true,
    });
    const hideSecret: Access = ({ req }) =>
      req.user?.email === editor.email ? { slug: { not_equals: "secret" } } : true;
    const { config } = harness.payload.collections.posts;
    const original = config.access.read;
    config.access.read = hideSecret;
    try {
      const request = {
        items: [{ collection: "folders", id: tree.products.id }],
        toFolder: archive.id,
      };

      const asAdmin = previewOf(await preview(request));
      const asEditor = previewOf(await preview(request, editor));

      expect(asAdmin.examples.map(({ from }) => from)).toContain("/products/secret");
      expect(asEditor.ok).toBe(true);
      expect(asEditor.examples.map(({ from }) => from)).toContain("/products/gift-cards");
      expect(JSON.stringify(asEditor)).not.toContain("secret");
    } finally {
      config.access.read = original;
    }
  });
});

describe("previewMove as a tool", () => {
  it("says it is the only way to move, and that the user is shown the summary first", async () => {
    const tool = (await listMcpTools(harness)).find(({ name }) => name === "previewMove");

    expect(tool?.description).toContain("only way to move");
    expect(tool?.description).toContain("updateDocument");
    expect(tool?.description).toContain("askUser");
    expect(tool?.description).not.toMatch(/[–—]/u);
    const schema = tool?.inputSchema as {
      properties: Record<string, { enum?: string[] }>;
      required: string[];
    };
    expect(Object.keys(schema.properties).sort()).toEqual(
      ["after", "items", "position", "redirects", "toFolder"].sort()
    );
    expect(schema.required).toEqual(["items"]);
  });
});
