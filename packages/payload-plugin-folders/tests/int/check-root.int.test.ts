import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type RootResult = { conflict?: { path: string; title: string }; message?: string; ok: boolean };

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

const check = (query: string, anonymous = false) =>
  callEndpoint<RootResult>({
    anonymous,
    config: harness.config,
    path: `/folders-tree/check-root?${query}`,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

const createPage = (
  payload: Payload,
  data: {
    folder: number | null;
    isFolderRoot?: boolean;
    slug: string;
    status?: "draft" | "published";
  }
) =>
  payload.create({
    collection: "pages",
    data: {
      _status: data.status ?? "published",
      folder: data.folder,
      isFolderRoot: data.isFolderRoot ?? false,
      slug: data.slug,
      title: data.slug,
    } as never,
    depth: 0,
    draft: data.status === "draft",
    overrideAccess: true,
  });

describe("GET /folders-tree/check-root", () => {
  it("is free for a folder without a root page", async () => {
    const folder = await createFolder(harness.payload, { slug: "docs" });
    await createPage(harness.payload, { folder: folder.id, slug: "intro" });

    expect((await check(`parent=${folder.id}`)).body).toEqual({ ok: true });
  });

  it("names a published root page and the folder's path", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    await createPage(payload, { folder: folder.id, isFolderRoot: true, slug: "overview" });

    const { body } = await check(`parent=${folder.id}`);

    expect(body).toEqual({
      conflict: { path: "/docs", title: "overview" },
      message: "overview is already the root page of /docs. Unset it first.",
      ok: false,
    });
  });

  it("counts a root that only exists as a draft, in a page that was never published", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    await createPage(payload, {
      folder: folder.id,
      isFolderRoot: true,
      slug: "draft-root",
      status: "draft",
    });

    expect((await check(`parent=${folder.id}`)).body.conflict?.title).toBe("draft-root");
  });

  it("counts a published page whose latest version is marked as the root, though its live row is not", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await createPage(payload, { folder: folder.id, slug: "later-root" });
    await payload.update({
      collection: "pages",
      data: { _status: "draft", isFolderRoot: true } as never,
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });

    const { body } = await check(`parent=${folder.id}`);

    expect(body.ok).toBe(false);
    expect(body.conflict?.title).toBe("later-root");
  });

  it("never counts the page being edited", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await createPage(payload, {
      folder: folder.id,
      isFolderRoot: true,
      slug: "overview",
    });

    expect((await check(`parent=${folder.id}&exclude=pages:${page.id}`)).body).toEqual({
      ok: true,
    });
  });

  it("answers for the site root, and for a folder that is gone", async () => {
    const { payload } = harness;
    await createPage(payload, { folder: null, isFolderRoot: true, slug: "home" });

    const site = await check("parent=root");
    const missing = await check("parent=999999");

    expect(site.body).toMatchObject({ conflict: { path: "/", title: "home" }, ok: false });
    expect(missing.status).toBe(404);
  });

  it("an unknown locale is 400", async () => {
    expect((await check("parent=root&locale=fr")).status).toBe(400);
    expect((await check("parent=root&locale=de")).status).toBe(200);
  });

  it("is for signed-in users only", async () => {
    expect((await check("parent=root", true)).status).toBe(403);
  });
});
