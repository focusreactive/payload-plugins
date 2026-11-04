import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { redirectsParameter } from "../../src/core/redirectsOptOut.js";
import type { PathChange, PathChangeReason } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
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
          reported.push({ changes, reason });
        },
      },
      redirects: { mirrorToRedirectsPlugin: true },
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

const forgetRows = async (payload: Payload): Promise<void> => {
  for (const collection of ["redirects", "folder-redirects"] as const) {
    await payload.db.deleteMany({ collection, where: { id: { exists: true } } });
  }
};

afterEach(async () => {
  reported.length = 0;
  await forgetRows(harness.payload);
  await clearTree(harness.payload);
});

const publishPage = (payload: Payload, folder: number, slug: string) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, isFolderRoot: false, slug, title: slug } as never,
    depth: 0,
    overrideAccess: true,
  });

const setUp = async () => {
  const { payload } = harness;
  const news = await createFolder(payload, { slug: "news" });
  const page = await publishPage(payload, news.id, "hello");
  await forgetRows(payload);
  reported.length = 0;

  return { news, page };
};

/** The rename the admin sends: Payload's own PATCH route, with the plugin's query parameter. */
const renameThroughRest = (id: number, slug: string, query = "") =>
  callEndpoint({
    body: { slug },
    config: harness.config,
    method: "PATCH",
    path: `/folders/${id}?depth=0&locale=en${query}`,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

const countRows = async (collection: "folder-redirects" | "redirects"): Promise<number> =>
  (await harness.payload.count({ collection, overrideAccess: true })).totalDocs;

describe("a folder rename that opts out of redirects", () => {
  it("writes the redirect rows by default", async () => {
    const { news } = await setUp();

    const { status } = await renameThroughRest(news.id, "press");

    expect(status).toBe(200);
    expect(await countRows("folder-redirects")).toBeGreaterThan(0);
    expect(await countRows("redirects")).toBeGreaterThan(0);
  });

  it("writes no row of either kind with the parameter set to false, and still saves and reports", async () => {
    const { news, page } = await setUp();

    const { status } = await renameThroughRest(news.id, "press", `&${redirectsParameter}=false`);

    expect(status).toBe(200);
    expect(await countRows("folder-redirects")).toBe(0);
    expect(await countRows("redirects")).toBe(0);
    const folder = (await harness.payload.findByID({
      collection: "folders",
      depth: 0,
      id: news.id,
      locale: "en",
      overrideAccess: true,
    })) as unknown as { fullPath: string; slug: string };
    expect(folder).toMatchObject({ fullPath: "/press", slug: "press" });
    const folderReports = reported.filter((entry) => !isPageSaveReason(entry.reason));
    expect(folderReports).toHaveLength(1);
    expect(folderReports[0]?.reason).toBe("folderUpdate");
    expect(folderReports[0]?.changes.some((change) => change.id === page.id)).toBe(true);
  });

  it("reports the same changes with and without the opt-out", async () => {
    const first = await setUp();
    await renameThroughRest(first.news.id, "press");
    const withRedirects = reported
      .filter((entry) => !isPageSaveReason(entry.reason))
      .map((entry) => entry.changes);

    await clearTree(harness.payload);
    reported.length = 0;
    const second = await setUp();
    await renameThroughRest(second.news.id, "press", `&${redirectsParameter}=false`);
    const withoutRedirects = reported
      .filter((entry) => !isPageSaveReason(entry.reason))
      .map((entry) => entry.changes);

    expect(withoutRedirects).toHaveLength(withRedirects.length);
    expect(withoutRedirects.map((changes) => changes.map((change) => change.to).sort())).toEqual(
      withRedirects.map((changes) => changes.map((change) => change.to).sort())
    );
  });

  it("ignores any value other than the word false", async () => {
    const { news } = await setUp();

    await renameThroughRest(news.id, "press", `&${redirectsParameter}=0`);

    expect(await countRows("folder-redirects")).toBeGreaterThan(0);
  });

  it("does not let the parameter turn redirects on when the host switched them off", async () => {
    const off = await getTestPayload({ foldersOptions: { redirects: { enabled: false } } });
    try {
      const folder = await createFolder(off.payload, { slug: "events" });
      await publishPage(off.payload, folder.id, "launch");

      await callEndpoint({
        body: { slug: "happenings" },
        config: off.config,
        method: "PATCH",
        path: `/folders/${folder.id}?depth=0&locale=en&${redirectsParameter}=true`,
        payload: off.payload,
        payloadInstanceCacheKey: off.cacheKey,
      });

      expect(
        (await off.payload.count({ collection: "folder-redirects", overrideAccess: true }))
          .totalDocs
      ).toBe(0);
    } finally {
      await off.destroy();
    }
  });

  it("leaves a page save alone: the parameter on a page PATCH still writes its row", async () => {
    const { page } = await setUp();

    const { status } = await callEndpoint({
      body: { _status: "published", slug: "hello-again" },
      config: harness.config,
      method: "PATCH",
      path: `/pages/${page.id}?depth=0&locale=en&${redirectsParameter}=false`,
      payload: harness.payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });

    expect(status).toBe(200);
    expect(await countRows("folder-redirects")).toBeGreaterThan(0);
  });
});
