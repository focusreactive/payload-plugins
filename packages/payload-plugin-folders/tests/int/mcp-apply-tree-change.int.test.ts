import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { stepOperation } from "../../src/core/operations.js";
import { createTestRequest } from "../helpers/treeFixtures.js";
import {
  issueConfirmationToken,
  setConfirmationTokenClock,
} from "../../src/mcp/confirmationToken.js";
import { setMirrorStepBudgetMs } from "../../src/mcp/stepMirror.js";
import { moveItems } from "../../src/server/index.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { seedGiftCardTree } from "../helpers/giftCardTree.js";
import type { GiftCardTree } from "../helpers/giftCardTree.js";
import { callMcpTool, listMcpTools } from "../helpers/mcpClient.js";
import { clearTree } from "../helpers/seedTree.js";

type Preview = { confirmationToken: string; needsConfirmation: boolean; summary: string };

type Applied = {
  done: boolean;
  mirrorBatch?: { done: number; operationId: number; status: string; total: number };
  moved: Array<{ collection: string; fullPath: Record<string, string | null>; id: number }>;
  publishedUrlChanges: { byLocale: Record<string, number>; total: number };
  redirects: { enabled: boolean; redirectsPluginRows: number; rowsWritten: number };
};

const otherEditor = { email: "mcp-apply-editor@example.com", password: "test-password" };

let harness: TestPayload;
let mirrorHarness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({ mcp: true });
  mirrorHarness = await getTestPayload({
    foldersOptions: {
      limits: { maxSyncDocuments: 1 },
      redirects: { mirrorToRedirectsPlugin: true },
    },
    mcp: true,
  });
  await harness.payload.create({
    collection: "users",
    data: { ...otherEditor, role: "editor" } as never,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
  await mirrorHarness?.destroy();
});

afterEach(async () => {
  for (const { payload } of [harness, mirrorHarness]) {
    for (const collection of ["redirects", "folder-redirects", "folder-operations"] as const) {
      await payload.db.deleteMany({ collection, where: { id: { exists: true } } });
    }
    await clearTree(payload);
  }
});

const previewMove = async (
  target: TestPayload,
  toolArguments: Record<string, unknown>,
  user?: typeof otherEditor
): Promise<Preview> => {
  const result = await callMcpTool(target, "previewMove", toolArguments, user);
  expect(result.isError).toBe(false);

  return result.structuredContent as Preview;
};

const apply = (
  target: TestPayload,
  toolArguments: Record<string, unknown>,
  user?: typeof otherEditor
) => callMcpTool(target, "applyTreeChange", toolArguments, user);

const giftCardsInto = (tree: GiftCardTree) => ({
  items: [{ collection: "pages", id: tree.giftCards.id }],
  toFolder: tree.guides.id,
});

const readPage = (payload: Payload, id: number, locale: "de" | "en") =>
  payload.findByID({
    collection: "pages",
    depth: 0,
    id,
    locale,
    overrideAccess: true,
  }) as unknown as Promise<{ folder: number | null; fullPath: string }>;

const countRows = async (payload: Payload, collection: "folder-redirects" | "redirects") =>
  (await payload.count({ collection, overrideAccess: true })).totalDocs;

const expectNothingMoved = async (payload: Payload, tree: GiftCardTree) => {
  expect((await readPage(payload, tree.giftCards.id, "en")).folder).toBe(tree.products.id);
  expect(await countRows(payload, "folder-redirects")).toBe(0);
};

describe("applyTreeChange for a previewed move", () => {
  it("moves the page in both languages, writes redirects and reads the new paths back", async () => {
    const { payload } = harness;
    const tree = await seedGiftCardTree(payload);
    const preview = await previewMove(harness, giftCardsInto(tree));

    const result = await apply(harness, {
      confirmationToken: preview.confirmationToken,
      confirmedSummary: preview.summary,
    });

    expect(result.isError).toBe(false);
    const applied = result.structuredContent as Applied;
    expect(applied.done).toBe(true);
    expect(applied.moved).toEqual([
      {
        collection: "pages",
        fullPath: { de: "/produkte/guides/gift-cards", en: "/products/guides/gift-cards" },
        id: tree.giftCards.id,
      },
    ]);
    expect(applied.publishedUrlChanges).toEqual({ byLocale: { de: 1, en: 1 }, total: 2 });
    expect(applied.redirects).toEqual({ enabled: true, redirectsPluginRows: 0, rowsWritten: 2 });
    expect(applied.mirrorBatch).toBeUndefined();
    expect((await readPage(payload, tree.giftCards.id, "en")).fullPath).toBe(
      "/products/guides/gift-cards"
    );
    expect((await readPage(payload, tree.giftCards.id, "de")).fullPath).toBe(
      "/produkte/guides/gift-cards"
    );
    expect(await countRows(payload, "folder-redirects")).toBe(2);
    expect(result.text).toContain("/products/guides/gift-cards");
    expect(result.text).toContain("/produkte/guides/gift-cards");
  });

  it("applies a change that needs no confirmation with the token alone", async () => {
    const { payload } = harness;
    const tree = await seedGiftCardTree(payload);
    const other = (await payload.create({
      collection: "pages",
      data: { _status: "published", folder: tree.products.id, slug: "other", title: "Other" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const preview = await previewMove(harness, {
      after: { collection: "pages", id: other.id },
      items: [{ collection: "pages", id: tree.giftCards.id }],
    });
    expect(preview.needsConfirmation).toBe(false);

    const result = await apply(harness, { confirmationToken: preview.confirmationToken });

    expect(result.isError).toBe(false);
    expect((result.structuredContent as Applied).publishedUrlChanges.total).toBe(0);
    expect(await countRows(payload, "folder-redirects")).toBe(0);
  });
});

describe("applyTreeChange refuses before it writes", () => {
  it("refuses a confirmedSummary that is not the preview's, or is missing", async () => {
    const { payload } = harness;
    const tree = await seedGiftCardTree(payload);
    const preview = await previewMove(harness, giftCardsInto(tree));

    const wrong = await apply(harness, {
      confirmationToken: preview.confirmationToken,
      confirmedSummary: "1 published URL will change.",
    });
    const missing = await apply(harness, { confirmationToken: preview.confirmationToken });

    for (const refused of [wrong, missing]) {
      expect(refused.isError).toBe(true);
      expect(refused.text).toContain("confirmedSummary");
      expect(refused.text).toContain("word for word");
    }
    await expectNothingMoved(payload, tree);
  });

  it("refuses a token another user previewed", async () => {
    const { payload } = harness;
    const tree = await seedGiftCardTree(payload);
    const preview = await previewMove(harness, giftCardsInto(tree));

    const result = await apply(
      harness,
      { confirmationToken: preview.confirmationToken, confirmedSummary: preview.summary },
      otherEditor
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("another user");
    await expectNothingMoved(payload, tree);
  });

  it("refuses text that is not a token", async () => {
    const result = await apply(harness, { confirmationToken: "not-a-token" });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("Preview again");
  });

  it("refuses a token that was used already, and writes no second set of redirects", async () => {
    const { payload } = harness;
    const tree = await seedGiftCardTree(payload);
    const preview = await previewMove(harness, giftCardsInto(tree));
    const arguments_ = {
      confirmationToken: preview.confirmationToken,
      confirmedSummary: preview.summary,
    };
    expect((await apply(harness, arguments_)).isError).toBe(false);

    const replay = await apply(harness, arguments_);

    expect(replay.isError).toBe(true);
    expect(replay.text).toContain("The tree changed since the preview. Preview again");
    expect(await countRows(payload, "folder-redirects")).toBe(2);
    expect((await readPage(payload, tree.giftCards.id, "en")).folder).toBe(tree.guides.id);
  });

  it("refuses when the page moved elsewhere after the preview", async () => {
    const { payload } = harness;
    const tree = await seedGiftCardTree(payload);
    const archive = (await payload.create({
      collection: "folders",
      data: { name: "Archive", slug: "archive" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const preview = await previewMove(harness, giftCardsInto(tree));
    await moveItems(payload, {
      items: [{ collection: "pages", id: tree.giftCards.id }],
      overrideAccess: true,
      toFolder: archive.id,
    });
    await payload.db.deleteMany({
      collection: "folder-redirects",
      where: { id: { exists: true } },
    });

    const result = await apply(harness, {
      confirmationToken: preview.confirmationToken,
      confirmedSummary: preview.summary,
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("The tree changed since the preview. Preview again");
    expect((await readPage(payload, tree.giftCards.id, "en")).folder).toBe(archive.id);
    expect(await countRows(payload, "folder-redirects")).toBe(0);
  });

  it("refuses when the URLs a folder move changes are not the ones previewed, and says what they are now", async () => {
    const { payload } = harness;
    const tree = await seedGiftCardTree(payload);
    const archive = (await payload.create({
      collection: "folders",
      data: { name: "Archive", slug: "archive" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const preview = await previewMove(harness, {
      items: [{ collection: "folders", id: tree.products.id }],
      toFolder: archive.id,
    });
    await payload.create({
      collection: "pages",
      data: { _status: "published", folder: tree.products.id, slug: "extra", title: "Extra" },
      depth: 0,
      overrideAccess: true,
    });

    const result = await apply(harness, {
      confirmationToken: preview.confirmationToken,
      confirmedSummary: preview.summary,
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain(
      "The tree changed since the preview. Preview again and confirm with the user."
    );
    expect(result.text).toContain("published URLs will change");
    expect(result.text).not.toContain(preview.summary);
    const products = (await payload.findByID({
      collection: "folders",
      depth: 0,
      id: tree.products.id,
      overrideAccess: true,
    })) as unknown as { parent: number | null };
    expect(products.parent).toBeNull();
    expect(await countRows(payload, "folder-redirects")).toBe(0);
  });

  it("refuses an expired token, with the clock moved instead of waiting", async () => {
    const { payload } = harness;
    const tree = await seedGiftCardTree(payload);
    const preview = await previewMove(harness, giftCardsInto(tree));
    const realClock = setConfirmationTokenClock(() => Date.now() + 16 * 60 * 1000);
    try {
      const result = await apply(harness, {
        confirmationToken: preview.confirmationToken,
        confirmedSummary: preview.summary,
      });

      expect(result.isError).toBe(true);
      expect(result.text).toContain("expired");
    } finally {
      setConfirmationTokenClock(realClock);
    }
    await expectNothingMoved(payload, tree);
  });

  it("answers a rename token that it is not available yet", async () => {
    const { payload } = harness;
    const [admin] = (await payload.find({ collection: "users", limit: 1, overrideAccess: true }))
      .docs;
    const token = issueConfirmationToken({
      digest: "digest",
      kind: "rename",
      request: { folder: 1 },
      secret: payload.secret,
      user: { collection: "users", id: admin.id },
    });

    const result = await apply(harness, { confirmationToken: token });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("not available yet");
  });
});

describe("applyTreeChange and the redirects plugin's batch", () => {
  it("steps the batch itself and reports it done with its operation id", async () => {
    const { payload } = mirrorHarness;
    const tree = await seedGiftCardTree(payload);
    const preview = await previewMove(mirrorHarness, giftCardsInto(tree));

    const result = await apply(mirrorHarness, {
      confirmationToken: preview.confirmationToken,
      confirmedSummary: preview.summary,
    });

    expect(result.isError).toBe(false);
    const applied = result.structuredContent as Applied;
    expect(applied.mirrorBatch).toMatchObject({ done: 2, status: "done", total: 2 });
    expect(applied.mirrorBatch?.operationId).toEqual(expect.any(Number));
    expect(applied.redirects.redirectsPluginRows).toBe(2);
    expect(await countRows(payload, "redirects")).toBe(2);
  });

  it("reports what is left, with its operation id, when the time runs out", async () => {
    const { payload } = mirrorHarness;
    const tree = await seedGiftCardTree(payload);
    const preview = await previewMove(mirrorHarness, giftCardsInto(tree));
    const previousBudget = setMirrorStepBudgetMs(0);
    let result: Awaited<ReturnType<typeof apply>>;
    try {
      result = await apply(mirrorHarness, {
        confirmationToken: preview.confirmationToken,
        confirmedSummary: preview.summary,
      });
    } finally {
      setMirrorStepBudgetMs(previousBudget);
    }

    expect(result.isError).toBe(false);
    const { mirrorBatch } = result.structuredContent as Applied;
    expect(mirrorBatch).toMatchObject({ done: 0, status: "running", total: 2 });
    expect(result.text).toContain(`operation ${mirrorBatch?.operationId}`);
    expect(await countRows(payload, "redirects")).toBe(0);

    const admin = await createTestRequest(payload);
    const [user] = (await payload.find({ collection: "users", limit: 1, overrideAccess: true }))
      .docs;
    admin.user = { ...user, collection: "users" } as never;
    const progress = await stepOperation(admin, mirrorBatch?.operationId as number);
    expect(progress.status).toBe("done");
    expect(await countRows(payload, "redirects")).toBe(2);
  });
});

describe("applyTreeChange as a tool", () => {
  it("tells the model to apply only a previewed change the user has answered", async () => {
    const tool = (await listMcpTools(harness)).find(({ name }) => name === "applyTreeChange");

    expect(tool?.description).toContain("previewMove");
    expect(tool?.description).toContain("confirmedSummary");
    expect(tool?.description).not.toMatch(/[–—]/u);
    const schema = tool?.inputSchema as { properties: Record<string, unknown>; required: string[] };
    expect(Object.keys(schema.properties).sort()).toEqual([
      "confirmationToken",
      "confirmedSummary",
    ]);
    expect(schema.required).toEqual(["confirmationToken"]);
  });
});
