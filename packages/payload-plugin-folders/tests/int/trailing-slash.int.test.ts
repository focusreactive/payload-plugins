import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { withoutTrailingSlash } from "../../src/core/paths.js";
import {
  computeFullPath,
  findRedirect,
  getAllPaths,
  getPathsPage,
  getTree,
  moveItems,
  repairTree,
  resolvePath,
  verifyTree,
} from "../../src/server/index.js";
import type { ResolveResult, TreeNode } from "../../src/server/index.js";
import type { PathChange } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { runGraphql } from "../helpers/runGraphql.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

const afterPathChangeSpy = vi.fn<(args: { changes: PathChange[] }) => void>();

let harness: TestPayload;
let adminUser: { id: number };

beforeAll(async () => {
  harness = await getTestPayload({
    // Posts are not in the redirects plugin here, so a moved post gets a custom-URL row.
    foldersOptions: {
      admin: {
        previewUrl: ({ collection, fullPath, locale }) =>
          `https://preview.example.test/${collection}${fullPath}?locale=${locale ?? ""}`,
      },
      collections: { pages: true, posts: true },
      hooks: { afterPathChange: afterPathChangeSpy },
      redirects: { mirrorToRedirectsPlugin: true },
      urls: { trailingSlash: true },
    },
    redirectsCollections: ["pages"],
  });
  adminUser = (await harness.payload.create({
    collection: "users",
    data: { email: "slash-admin@example.com", password: "test-password", role: "admin" },
    overrideAccess: true,
  })) as unknown as { id: number };
});

afterAll(async () => {
  await harness?.destroy();
});

const forgetRows = async (payload: Payload): Promise<void> => {
  for (const collection of ["redirects", "folder-redirects", "folder-operations"] as const) {
    await payload.db.deleteMany({ collection, where: { id: { exists: true } } });
  }
};

beforeEach(() => {
  afterPathChangeSpy.mockClear();
});

afterEach(async () => {
  await forgetRows(harness.payload);
  await clearTree(harness.payload);
});

const createPublished = async (
  payload: Payload,
  data: {
    collection?: "pages" | "posts";
    folder?: number | null;
    isFolderRoot?: boolean;
    slug: string;
  }
): Promise<{ id: number }> =>
  (await payload.create({
    collection: data.collection ?? "pages",
    data: {
      ...((data.collection ?? "pages") === "pages" ? { _status: "published" } : {}),
      folder: data.folder ?? null,
      isFolderRoot: data.isFolderRoot ?? false,
      slug: data.slug,
      title: data.slug,
    } as never,
    depth: 0,
    overrideAccess: true,
  })) as unknown as { id: number };

type Seeded = { folder: { id: number }; root: { id: number }; team: { id: number } };

const seed = async (payload: Payload, slug = "ts"): Promise<Seeded> => {
  const folder = await createFolder(payload, { name: slug, slug });
  const root = await createPublished(payload, {
    folder: folder.id,
    isFolderRoot: true,
    slug: "home",
  });
  const team = await createPublished(payload, { folder: folder.id, slug: "team" });

  return { folder, root, team };
};

const resolve = (path: string): Promise<ResolveResult> =>
  resolvePath(harness.payload, { overrideAccess: true, path });

const renameFolder = (id: number, slug: string) =>
  harness.payload.update({
    collection: "folders",
    data: { name: slug, slug },
    depth: 0,
    id,
    overrideAccess: true,
  });

const readPage = (id: number, locale?: "all") =>
  harness.payload.findByID({
    collection: "pages",
    depth: 0,
    id,
    ...(locale ? { locale } : {}),
    overrideAccess: true,
  }) as unknown as Promise<{ fullPath: unknown; folderPath: unknown }>;

type MirrorRow = { from: string; to: { type: string; url?: string | null } };

const readMirrorRows = async (): Promise<MirrorRow[]> =>
  (
    await harness.payload.find({
      collection: "redirects",
      depth: 0,
      overrideAccess: true,
      pagination: false,
      sort: "from",
    })
  ).docs as unknown as MirrorRow[];

const flatten = (nodes: TreeNode[]): TreeNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

const expectNoLoop = async (answer: ResolveResult): Promise<void> => {
  if (answer.type !== "redirect") {
    return;
  }
  // The framework serves one form and redirects the other, so a loop is a redirect whose target
  // answers another redirect in either form.
  expect((await resolve(answer.to)).type).toBe("page");
  expect((await resolve(withoutTrailingSlash(answer.to))).type).toBe("page");
};

describe("reads, with urls.trailingSlash true", () => {
  it("a page's fullPath ends in a slash, the site root and a file-like segment excepted", async () => {
    const { payload } = harness;
    const { root, team, folder } = await seed(payload);
    const feed = await createPublished(payload, { folder: folder.id, slug: "feed.xml" });
    const site = await createPublished(payload, { isFolderRoot: true, slug: "start" });

    expect((await readPage(team.id)).fullPath).toBe("/ts/team/");
    expect((await readPage(root.id)).fullPath).toBe("/ts/");
    expect((await readPage(site.id)).fullPath).toBe("/");
    expect((await readPage(feed.id)).fullPath).toBe("/ts/feed.xml");
    expect((await readPage(team.id, "all")).fullPath).toEqual({
      de: "/ts/team/",
      en: "/ts/team/",
    });
  });

  it("stored paths and query keys stay canonical", async () => {
    const { payload } = harness;
    const { folder, team } = await seed(payload);

    const storedFolder = (await payload.findByID({
      collection: "folders",
      depth: 0,
      id: folder.id,
      overrideAccess: true,
    })) as unknown as { fullPath: string };
    expect(storedFolder.fullPath).toBe("/ts");
    expect((await readPage(team.id)).folderPath).toBe("/ts");

    const found = await payload.find({
      collection: "pages",
      depth: 0,
      overrideAccess: true,
      where: { folderPath: { equals: "/ts" } },
    });
    expect(found.docs.map((doc) => doc.id)).toContain(team.id);
  });
});

describe("resolvePath, with urls.trailingSlash true", () => {
  it("answers a page in the configured form, with or without the slash in the request", async () => {
    await seed(harness.payload);

    for (const path of ["/ts/team", "/ts/team/"]) {
      expect(await resolve(path)).toMatchObject({
        alternates: { de: "/ts/team/", en: "/ts/team/" },
        fullPath: "/ts/team/",
        type: "page",
      });
    }
  });

  it("redirects a case or repeated-slash difference to the configured form", async () => {
    await seed(harness.payload);

    for (const path of ["/TS/team", "//ts//team", "/TS/team/"]) {
      const answer = await resolve(path);

      expect(answer).toEqual({ status: 301, to: "/ts/team/", type: "redirect" });
      await expectNoLoop(answer);
    }
  });

  it("answers the site root and a file-like path in place", async () => {
    const { folder } = await seed(harness.payload);
    await createPublished(harness.payload, { folder: folder.id, slug: "feed.xml" });
    await createPublished(harness.payload, { isFolderRoot: true, slug: "start" });

    expect(await resolve("/")).toMatchObject({ fullPath: "/", type: "page" });
    expect(await resolve("/ts/feed.xml/")).toMatchObject({
      fullPath: "/ts/feed.xml",
      type: "page",
    });
  });
});

describe("a rename and a move, with urls.trailingSlash true", () => {
  it("the old path redirects to the new one in the configured form, both ways in", async () => {
    const { payload } = harness;
    const { folder } = await seed(payload);

    await renameFolder(folder.id, "ts2");

    for (const path of ["/ts/team", "/ts/team/"]) {
      const answer = await resolve(path);

      expect(answer).toEqual({ status: 301, to: "/ts2/team/", type: "redirect" });
      await expectNoLoop(answer);
    }
    expect(await findRedirect(payload, { path: "/ts/team" })).toMatchObject({ to: "/ts2/team/" });
    // The row is a lookup key, so it stays canonical.
    const { docs } = await payload.db.find({ collection: "folder-redirects" as never });
    expect(docs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromPath: "/ts", kind: "folderPrefix", lookupKey: "en:/ts" }),
      ])
    );
  });

  it("the mirror writes rows in the configured form, a de root path and a custom url included", async () => {
    const { payload } = harness;
    const { folder } = await seed(payload);
    const post = await createPublished(payload, {
      collection: "posts",
      folder: folder.id,
      slug: "story",
    });
    const elsewhere = await createFolder(payload, { slug: "elsewhere" });

    await renameFolder(folder.id, "ts2");
    await payload.update({
      collection: "folders",
      data: { name: "Ordner", slug: "ordner" },
      depth: 0,
      id: elsewhere.id,
      locale: "de",
      overrideAccess: true,
    });
    await moveItems(payload, {
      items: [{ collection: "posts", id: post.id }],
      overrideAccess: true,
      toFolder: elsewhere.id,
    });

    const rows = await readMirrorRows();
    const froms = rows.map((row) => row.from);
    expect(froms).toEqual(expect.arrayContaining(["/ts/team/", "/ts/"]));
    expect(froms.filter((from) => from !== "/" && !from.endsWith("/"))).toEqual([]);
    const customRow = rows.find((row) => row.from === "/ts2/story/");
    expect(customRow?.to).toMatchObject({ type: "custom", url: "/elsewhere/story/" });
  });

  it("a de-only change writes a de row with the slash", async () => {
    const { payload } = harness;
    const { folder } = await seed(payload);

    await payload.update({
      collection: "folders",
      data: { name: "Ordner", slug: "ordner" },
      depth: 0,
      id: folder.id,
      locale: "de",
      overrideAccess: true,
    });

    const froms = (await readMirrorRows()).map((row) => row.from);
    expect(froms).toContain("/de/ts/team/");
    expect(froms).toContain("/de/ts/");
  });

  it("afterPathChange gets the form, for the pages and for the folder row", async () => {
    const { folder } = await seed(harness.payload);
    afterPathChangeSpy.mockClear();

    await renameFolder(folder.id, "ts2");

    const changes = afterPathChangeSpy.mock.calls.flatMap(([call]) => call.changes);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "/ts/team/", kind: "page", to: "/ts2/team/" }),
        expect.objectContaining({ from: "/ts/", kind: "folder", to: "/ts2/" }),
      ])
    );
  });
});

describe("the read helpers, with urls.trailingSlash true", () => {
  it("getTree formats folder nodes, their alternates and page nodes", async () => {
    const { folder } = await seed(harness.payload);
    await renameFolder(folder.id, "ts2");

    const nodes = flatten(await getTree(harness.payload, { depth: 5, overrideAccess: true }));
    const folderNode = nodes.find((node) => node.kind === "folder");

    expect(folderNode?.fullPath).toBe("/ts2/");
    expect(folderNode?.alternates).toEqual({ de: "/ts2/", en: "/ts2/" });
    expect(nodes.filter((node) => node.kind === "page").map((node) => node.fullPath)).toEqual(
      expect.arrayContaining(["/ts2/", "/ts2/team/"])
    );
  });

  it("getAllPaths, getPathsPage and the paths endpoint list formatted paths, and under takes both forms", async () => {
    const { folder } = await seed(harness.payload);
    await renameFolder(folder.id, "ts2");

    const withSlash = await getAllPaths(harness.payload, { overrideAccess: true, under: "/ts2/" });
    const withoutSlash = await getAllPaths(harness.payload, {
      overrideAccess: true,
      under: "/ts2",
    });
    expect(withSlash.map((row) => row.fullPath)).toEqual(["/ts2/", "/ts2/team/"]);
    expect(withoutSlash).toEqual(withSlash);

    const page = await getPathsPage(harness.payload, {
      limit: 100,
      overrideAccess: true,
      page: 1,
      under: "/ts2",
    });
    expect(page.docs.map((row) => row.fullPath).toSorted()).toEqual(["/ts2/", "/ts2/team/"]);

    const { body } = await callEndpoint<{ docs: Array<{ fullPath: string }> }>({
      config: harness.config,
      path: "/folders-tree/paths?under=/ts2/&limit=100",
      payload: harness.payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(body.docs.map((row) => row.fullPath).toSorted()).toEqual(["/ts2/", "/ts2/team/"]);
  });

  it("computeFullPath answers in the form", async () => {
    const { folder } = await seed(harness.payload, "ts2");

    expect(
      await computeFullPath(harness.payload, {
        folder: folder.id,
        isFolderRoot: false,
        slug: "new",
      })
    ).toBe("/ts2/new/");
    expect(
      await computeFullPath(harness.payload, { folder: folder.id, isFolderRoot: true, slug: "" })
    ).toBe("/ts2/");
    expect(
      await computeFullPath(harness.payload, { folder: null, isFolderRoot: true, slug: "" })
    ).toBe("/");
  });

  it("foldersResolve over GraphQL answers in the form", async () => {
    const { folder } = await seed(harness.payload);
    await renameFolder(folder.id, "ts2");
    const answerOf = async (path: string) => {
      const outcome = await runGraphql(
        harness,
        adminUser,
        `{ foldersResolve(path: "${path}", locale: "en") { type fullPath redirectTo alternates { locale path } } }`
      );
      expect(outcome.invalid).toBeUndefined();
      expect(outcome.errors).toBeUndefined();

      return (outcome.data as { foldersResolve: Record<string, unknown> }).foldersResolve;
    };

    expect(await answerOf("/ts2/team")).toMatchObject({
      alternates: [
        { locale: "en", path: "/ts2/team/" },
        { locale: "de", path: "/ts2/team/" },
      ],
      fullPath: "/ts2/team/",
      type: "page",
    });
    expect(await answerOf("/ts/team")).toMatchObject({
      redirectTo: "/ts2/team/",
      type: "redirect",
    });
  });

  it("the preview endpoint hands the builder the form, whichever the client sent", async () => {
    await seed(harness.payload, "ts2");

    for (const fullPath of ["/ts2/team", "/ts2/team/"]) {
      const { body } = await callEndpoint<{ url: string }>({
        config: harness.config,
        path: `/folders-tree/preview-url?collection=pages&fullPath=${fullPath}&locale=en`,
        payload: harness.payload,
        payloadInstanceCacheKey: harness.cacheKey,
      });

      expect(body.url).toBe("https://preview.example.test/pages/ts2/team/?locale=en");
    }
  });
});

describe("mirror rows after the option was switched", () => {
  const createMirrorRow = (from: string, url = "/dest/") =>
    harness.payload.create({
      collection: "redirects",
      data: { from, to: { type: "custom", url } } as never,
      overrideAccess: true,
    });

  it("verify lists a row in the other form, and repair rewrites it, drops a duplicate and leaves a query alone", async () => {
    const { payload } = harness;
    await createMirrorRow("/legacy-a");
    await createMirrorRow("/clash");
    await createMirrorRow("/clash/");
    await createMirrorRow("/q?x=1");
    await createMirrorRow("/url-only/", "/target");

    const verified = await verifyTree(payload);
    const drifted = verified.issues.filter((issue) => issue.kind === "mirrorSlashForm");
    expect(drifted.map((issue) => (issue as { from: string }).from).toSorted()).toEqual([
      "/clash",
      "/legacy-a",
      "/url-only/",
    ]);
    expect(drifted.every((issue) => issue.fixable)).toBe(true);

    await repairTree(payload);

    const rows = await readMirrorRows();
    expect(rows.map((row) => row.from)).toEqual(["/clash/", "/legacy-a/", "/q?x=1", "/url-only/"]);
    expect(rows.find((row) => row.from === "/legacy-a/")?.to.url).toBe("/dest/");
    expect(rows.find((row) => row.from === "/url-only/")?.to.url).toBe("/target/");
    expect(
      (await verifyTree(payload)).issues.filter((issue) => issue.kind === "mirrorSlashForm")
    ).toEqual([]);
  });
});

const readRedirectRows = async (payload: Payload) =>
  (await payload.db.find({ collection: "folder-redirects" as never, sort: "id" })).docs;

describe("switching the option on a live database", () => {
  it.skipIf(process.env.TEST_DB !== "postgres")(
    "stored rows do not change, resolve takes the new form and repair fixes the mirror rows",
    async () => {
      const mirror = { redirects: { mirrorToRedirectsPlugin: true } };
      const before = await getTestPayload({ foldersOptions: mirror });
      const after = await getTestPayload({
        foldersOptions: { ...mirror, urls: { trailingSlash: true } },
        sharedWith: before,
      });
      try {
        const folder = await createFolder(before.payload, { slug: "sw" });
        const other = await createFolder(before.payload, { slug: "sw-other" });
        const page = await createPublished(before.payload, { folder: folder.id, slug: "item" });
        await moveItems(before.payload, {
          items: [{ collection: "pages", id: page.id }],
          overrideAccess: true,
          toFolder: other.id,
        });

        const storedBefore = await readRedirectRows(before.payload);
        expect(storedBefore.length).toBeGreaterThan(0);
        expect(await readRedirectRows(after.payload)).toEqual(storedBefore);

        expect(
          await resolvePath(after.payload, { overrideAccess: true, path: "/sw-other/item" })
        ).toMatchObject({ fullPath: "/sw-other/item/", type: "page" });

        const verified = await verifyTree(after.payload);
        expect(
          verified.issues
            .filter((issue) => issue.kind === "mirrorSlashForm")
            .map((issue) => (issue as { from: string }).from)
            .toSorted()
        ).toEqual(["/de/sw/item", "/sw/item"]);

        await repairTree(after.payload);

        const rows = (
          await after.payload.find({
            collection: "redirects",
            depth: 0,
            overrideAccess: true,
            pagination: false,
          })
        ).docs as unknown as MirrorRow[];
        expect(rows.map((row) => row.from).toSorted()).toEqual(["/de/sw/item/", "/sw/item/"]);
        expect(await readRedirectRows(after.payload)).toEqual(storedBefore);
      } finally {
        await after.destroy();
        await before.destroy();
      }
    }
  );
});
