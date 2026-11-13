import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { moveItems } from "../../src/server/index.js";
import type { PathChange, PathChangeReason } from "../../src/types.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { isPageSaveReason } from "../helpers/pathChangeReasons.js";
import { createFolder } from "../helpers/treeFixtures.js";

type Report = { changes: PathChange[]; reason: PathChangeReason };

const reports: Report[] = [];
let harness: TestPayload;

beforeAll(async () => {
  // The redirects plugin knows only `pages`, so a post's mirror rows are custom-URL rows.
  harness = await getTestPayload({
    foldersOptions: {
      hooks: {
        afterPathChange: ({ changes, reason }) => {
          if (!isPageSaveReason(reason)) {
            reports.push({ changes, reason });
          }
        },
      },
      redirects: { mirrorToRedirectsPlugin: true },
    },
    redirectsCollections: ["pages"],
    trash: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
});

const customRowsTo = async (payload: Payload, url: string) =>
  (
    await payload.find({
      collection: "redirects",
      depth: 0,
      overrideAccess: true,
      pagination: false,
      where: { and: [{ "to.type": { equals: "custom" } }, { "to.url": { equals: url } }] },
    })
  ).docs;

describe("deleting a page that is already in the trash", () => {
  it("reports its URLs and clears its custom redirect rows when it goes to the trash, and not again", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const archive = await createFolder(payload, { slug: "archive" });
    const post = await payload.create({
      collection: "posts",
      data: { folder: news.id, slug: "story", title: "Story" },
      depth: 0,
      overrideAccess: true,
    });
    await moveItems(payload, {
      items: [{ collection: "posts", id: post.id }],
      overrideAccess: true,
      toFolder: archive.id,
    });
    expect(await customRowsTo(payload, "/archive/story")).toHaveLength(1);

    await payload.update({
      collection: "posts",
      data: { deletedAt: new Date().toISOString() } as never,
      depth: 0,
      id: post.id,
      overrideAccess: true,
    });
    expect(reports.filter(({ reason }) => reason === "delete")).toHaveLength(1);
    expect(await customRowsTo(payload, "/archive/story")).toHaveLength(0);

    // A row that appeared after the trash step: only a second cleanup would remove it.
    await payload.create({
      collection: "redirects",
      data: { from: "/stale/story", to: { type: "custom", url: "/archive/story" } } as never,
      overrideAccess: true,
    });
    reports.length = 0;

    await payload.delete({ collection: "posts", id: post.id, overrideAccess: true, trash: true });

    const stored = await payload.count({
      collection: "posts",
      overrideAccess: true,
      trash: true,
      where: { id: { equals: post.id } },
    });
    expect(stored.totalDocs).toBe(0);
    expect(reports.filter(({ reason }) => reason === "delete")).toEqual([]);
    expect(await customRowsTo(payload, "/archive/story")).toHaveLength(1);
  });
});
