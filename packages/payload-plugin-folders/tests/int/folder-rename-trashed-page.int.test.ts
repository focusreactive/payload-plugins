import type { Payload } from "payload";
import { createPayloadRequest } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { planFolderEdit } from "../../src/server/index.js";
import type { PathChange, PathChangeReason } from "../../src/types.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { isPageSaveReason } from "../helpers/pathChangeReasons.js";
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
          if (!isPageSaveReason(reason)) {
            reported.push({ changes, reason });
          }
        },
      },
      redirects: { mirrorToRedirectsPlugin: true },
    },
    trash: "pagesOnly",
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  reported.length = 0;
  for (const collection of ["redirects", "folder-redirects", "folder-operations"] as const) {
    await harness.payload.db.deleteMany({ collection, where: { id: { exists: true } } });
  }
  await clearTree(harness.payload);
});

const publishPage = (payload: Payload, folder: number, slug: string) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, isFolderRoot: false, slug, title: slug } as never,
    depth: 0,
    overrideAccess: true,
  });

// A trashed page keeps its folder and its last status, which is published when it had no newer draft.
const trashPage = (payload: Payload, id: number) =>
  payload.update({
    collection: "pages",
    data: { deletedAt: new Date().toISOString() } as never,
    depth: 0,
    id,
    overrideAccess: true,
  });

const setUp = async () => {
  const { payload } = harness;
  const news = await createFolder(payload, { slug: "news" });
  const trashed = await publishPage(payload, news.id, "foo");
  const live = await publishPage(payload, news.id, "bar");
  await trashPage(payload, trashed.id);
  reported.length = 0;
  await payload.db.deleteMany({ collection: "redirects", where: { id: { exists: true } } });
  await payload.db.deleteMany({ collection: "folder-redirects", where: { id: { exists: true } } });

  return { live, news, trashed };
};

const renameNews = (id: number) =>
  harness.payload.update({
    collection: "folders",
    data: { slug: "press" },
    depth: 0,
    id,
    overrideAccess: true,
  });

describe("renaming a folder that holds a trashed published page", () => {
  it("leaves the trashed page out of the redirects, the mirror and the report", async () => {
    const { payload } = harness;
    const { live, news, trashed } = await setUp();

    await renameNews(news.id);

    const mirrorRows = await payload.find({
      collection: "redirects",
      depth: 0,
      overrideAccess: true,
      pagination: false,
    });
    const mirroredFroms = (mirrorRows.docs as unknown as Array<{ from: string }>).map(
      (row) => row.from
    );
    expect(mirroredFroms).toContain("/news/bar");
    expect(mirroredFroms.some((from) => from.endsWith("/foo"))).toBe(false);

    const historyRows = await payload.find({
      collection: "folder-redirects" as never,
      depth: 0,
      overrideAccess: true,
      pagination: false,
    });
    const targetedPageIds = (
      historyRows.docs as unknown as Array<{ kind: string; target?: { value: number } | null }>
    )
      .filter((row) => row.kind === "page")
      .map((row) => row.target?.value);
    expect(targetedPageIds).not.toContain(trashed.id);

    expect(reported).toHaveLength(1);
    const reportedPageIds = new Set(
      (reported[0]?.changes ?? []).filter((change) => change.kind === "page").map((c) => c.id)
    );
    expect(reportedPageIds.has(live.id)).toBe(true);
    expect(reportedPageIds.has(trashed.id)).toBe(false);
  });

  it("keeps the trashed page's path current, so a restore lands at the new URL", async () => {
    const { payload } = harness;
    const { news, trashed } = await setUp();

    await renameNews(news.id);

    const stored = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: trashed.id,
      overrideAccess: true,
      trash: true,
    })) as unknown as { fullPath: string };
    expect(stored.fullPath).toBe("/press/foo");

    await payload.update({
      collection: "pages",
      data: { deletedAt: null } as never,
      depth: 0,
      id: trashed.id,
      overrideAccess: true,
      trash: true,
    });
    const restored = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: trashed.id,
      overrideAccess: true,
    })) as unknown as { fullPath: string };
    expect(restored.fullPath).toBe("/press/foo");
  });

  it("does not count the trashed page in the rename preview", async () => {
    const { payload } = harness;
    const { news } = await setUp();

    const preview = await planFolderEdit(
      await createPayloadRequest({ payload, req: {} }),
      { folder: news.id, slug: "press" },
      { overrideAccess: true }
    );

    // Only the live page: the trashed one is neither a URL change nor a mirror row.
    expect(preview.urlChanges.published).toBe(1);
    expect(preview.urlChanges.publishedAcrossLocales).toBe(2);
    expect(preview.mirrorRowsToWrite).toBe(2);
  });
});
