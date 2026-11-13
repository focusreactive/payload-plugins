import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { duplicateItems } from "../../src/core/duplicate.js";
import type { PathChange, PathChangeReason } from "../../src/types.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type Reported = { changes: PathChange[]; reason: PathChangeReason };

const reported: Reported[] = [];
let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({
    foldersOptions: {
      hooks: {
        afterPathChange: ({ changes, reason }) => {
          reported.push({ changes, reason });
        },
      },
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  reported.length = 0;
  await clearTree(harness.payload);
});

const createPage = (
  payload: Payload,
  data: { folder: number; status: "draft" | "published"; slug: string }
) =>
  payload.create({
    collection: "pages",
    data: {
      _status: data.status,
      folder: data.folder,
      isFolderRoot: false,
      slug: data.slug,
      title: data.slug,
    } as never,
    depth: 0,
    overrideAccess: true,
  });

const updatePage = (payload: Payload, id: number, data: Record<string, unknown>) =>
  payload.update({
    collection: "pages",
    data: data as never,
    depth: 0,
    id,
    locale: "en",
    overrideAccess: true,
  });

const byLocale = (changes: PathChange[]) =>
  Object.fromEntries(changes.map((change) => [change.locale, change]));

describe("afterPathChange for a page save", () => {
  it("a published page created live reports its new path per locale as a create", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });

    const page = await createPage(payload, {
      folder: folder.id,
      slug: "post",
      status: "published",
    });

    expect(reported).toHaveLength(1);
    expect(reported[0]?.reason).toBe("create");
    expect(byLocale(reported[0]?.changes ?? [])).toMatchObject({
      de: { from: null, id: page.id, published: true, to: "/blog/post" },
      en: { from: null, id: page.id, published: true, to: "/blog/post" },
    });
  });

  it("a draft create reports nothing", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });

    await createPage(payload, { folder: folder.id, slug: "post", status: "draft" });

    expect(reported).toEqual([]);
  });

  it("publishing a draft reports the page's new path", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });
    const page = await createPage(payload, { folder: folder.id, slug: "post", status: "draft" });

    await updatePage(payload, page.id, { _status: "published" });

    expect(reported).toHaveLength(1);
    expect(reported[0]?.reason).toBe("publish");
    expect(byLocale(reported[0]?.changes ?? []).en).toMatchObject({
      from: null,
      to: "/blog/post",
    });
  });

  it("a publish that changes the slug reports from and to once, per locale", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });
    const page = await createPage(payload, {
      folder: folder.id,
      slug: "post",
      status: "published",
    });
    reported.length = 0;

    await updatePage(payload, page.id, { _status: "published", slug: "post-2" });

    expect(reported).toHaveLength(1);
    expect(reported[0]?.reason).toBe("publish");
    expect(byLocale(reported[0]?.changes ?? [])).toMatchObject({
      de: { from: "/blog/post", published: true, to: "/blog/post-2" },
      en: { from: "/blog/post", published: true, to: "/blog/post-2" },
    });
  });

  it("a draft save over a published page reports nothing, because no live URL changed", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });
    const page = await createPage(payload, {
      folder: folder.id,
      slug: "post",
      status: "published",
    });
    reported.length = 0;

    await updatePage(payload, page.id, { _status: "draft", slug: "post-2" });

    expect(reported).toEqual([]);
  });

  it("making a published page the root page of its folder reports a root toggle", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });
    const page = await createPage(payload, {
      folder: folder.id,
      slug: "intro",
      status: "published",
    });
    reported.length = 0;

    await updatePage(payload, page.id, { _status: "published", isFolderRoot: true });

    expect(reported).toHaveLength(1);
    expect(reported[0]?.reason).toBe("rootToggle");
    expect(byLocale(reported[0]?.changes ?? []).en).toMatchObject({
      from: "/blog/intro",
      to: "/blog",
    });
  });

  // The copies are drafts, so no URL went live and the hook has nothing to say. The pages
  // collection keeps its status per locale, where Payload copies the original's published status
  // onto the copy before the duplicate unpublishes it.
  it("a duplicate of a published page reports nothing", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "blog" });
    const page = await createPage(payload, {
      folder: folder.id,
      slug: "post",
      status: "published",
    });
    reported.length = 0;

    const result = await duplicateItems(payload, {
      items: [{ collection: "pages", id: page.id }],
      overrideAccess: true,
    });

    expect(result).toMatchObject({ copied: 1 });
    expect(reported).toEqual([]);
  });
});
