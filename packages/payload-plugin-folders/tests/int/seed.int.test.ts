import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { assertSeedAllowed } from "../../dev/seedGuard.js";
import { seededUsers, seedSandboxTree } from "../../dev/seedSandboxTree.js";
import type { SeedSummary } from "../../dev/seedSandboxTree.js";
import { findRedirect } from "../../src/server/index.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";

let harness: TestPayload;
let summary: SeedSummary;

// A large seed takes a while on its own; the small one is shared by every other case.
const largeSeedTimeoutMs = 180_000;

beforeAll(async () => {
  harness = await getTestPayload();
  summary = await seedSandboxTree(harness.payload);
});

afterAll(async () => {
  await harness?.destroy();
});

type FolderRow = {
  allowedTypes: string[] | null;
  fullPath: Record<string, string>;
  id: number;
  name: Record<string, string>;
  slug: Record<string, string>;
};

const readFolders = async (payload: Payload): Promise<FolderRow[]> => {
  const { docs } = await payload.find({
    collection: "folders",
    depth: 0,
    limit: 0,
    locale: "all",
    overrideAccess: true,
    pagination: false,
  });

  return docs as unknown as FolderRow[];
};

const pathsOf = (folders: FolderRow[], locale: string): string[] =>
  folders.map((folder) => folder.fullPath[locale] ?? folder.fullPath.en).sort();

/** Every stored row of every collection the seed touches, with its timestamps. */
const snapshotDatabase = async (payload: Payload): Promise<Record<string, unknown>> => {
  const snapshot: Record<string, unknown> = {};
  for (const collection of ["folders", "pages", "posts", "users", "folder-redirects"] as const) {
    const { docs } = await payload.db.find({
      collection,
      limit: 0,
      locale: "all",
      pagination: false,
      sort: "id",
    });
    snapshot[collection] = docs;
  }
  snapshot.versions = (
    await payload.db.findVersions({
      collection: "pages",
      limit: 0,
      locale: "all",
      pagination: false,
      sort: "id",
    })
  ).docs;
  snapshot.revision = await payload.db.findGlobal({ slug: "folders-tree-state" as never });

  return snapshot;
};

const assertLargeSeed = async (payload: Payload): Promise<void> => {
  const large = await seedSandboxTree(payload, { largePageCount: 2000 });

  const countArchived = async (): Promise<number> =>
    (
      await payload.count({
        collection: "pages",
        locale: "en",
        overrideAccess: true,
        where: { folder: { equals: large.folders.archive } },
      })
    ).totalDocs;
  expect(await countArchived()).toBe(2000);
  // A re-run with the same count adds none.
  await seedSandboxTree(payload, { largePageCount: 2000 });
  expect(await countArchived()).toBe(2000);
};

describe("the dev seed guard", () => {
  it("refuses production and any database that is not a local SQLite file", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "production" })).toThrow(/production/u);
    expect(() =>
      assertSeedAllowed({ DATABASE_URI: "postgres://user:secret@db.example.com/app" })
    ).toThrow(/SQLite/u);
    expect(() => assertSeedAllowed({ DATABASE_URI: "mongodb://localhost/app" })).toThrow(/SQLite/u);
    // The dev app's own database, and no setting at all, are fine.
    expect(() => assertSeedAllowed({ DATABASE_URI: "file:/tmp/dev.db" })).not.toThrow();
    expect(() => assertSeedAllowed({ NODE_ENV: "development" })).not.toThrow();
    expect(() => assertSeedAllowed({})).not.toThrow();
  });

  it("does not put the database address in its message", () => {
    const refusal = (): Error => {
      try {
        assertSeedAllowed({ DATABASE_URI: "postgres://user:secret@db.example.com/app" });
      } catch (error) {
        return error as Error;
      }
      throw new Error("The seed guard let a remote database through");
    };

    expect(refusal().message).not.toContain("secret");
    expect(refusal().message).not.toContain("db.example.com");
  });
});

describe("the dev seed", () => {
  it("the seed creates every folder of the sandbox tree", async () => {
    const { payload } = harness;
    const folders = await readFolders(payload);

    expect(pathsOf(folders, "en")).toEqual([
      "/blog",
      "/blog/2026",
      "/company",
      "/empty",
      "/products",
      "/shoes",
      "/shoes/running",
    ]);
    // The 2026 folder takes articles only.
    const year = folders.find((folder) => folder.id === summary.folders.year) as FolderRow;
    expect(year.allowedTypes).toEqual(["posts"]);

    const rootPages = await payload.find({
      collection: "pages",
      depth: 0,
      limit: 0,
      locale: "en",
      overrideAccess: true,
      pagination: false,
      where: { isFolderRoot: { equals: true } },
    });
    expect(rootPages.docs.map((page) => page.fullPath).sort()).toEqual([
      "/",
      "/blog",
      "/company",
      "/products",
      "/shoes",
      "/shoes/running",
    ]);
    const contact = await payload.find({
      collection: "pages",
      depth: 0,
      locale: "en",
      overrideAccess: true,
      where: { folder: { equals: summary.folders.company } },
    });
    expect(contact.docs.map((page) => page.fullPath)).toContain("/company/contact");
    const articles = await payload.find({
      collection: "posts",
      depth: 0,
      overrideAccess: true,
      where: { folder: { equals: summary.folders.year } },
    });
    expect(articles.docs.map((post) => post.fullPath).sort()).toEqual([
      "/blog/2026/new-year",
      "/blog/2026/spring-update",
    ]);
  });

  it("shoes/running sits at /shoes/running", async () => {
    const { payload } = harness;
    const running = await payload.findByID({
      collection: "folders",
      depth: 0,
      id: summary.folders.running,
      locale: "all",
      overrideAccess: true,
    });
    const shoes = await payload.findByID({
      collection: "folders",
      depth: 0,
      id: summary.folders.shoes,
      overrideAccess: true,
    });

    expect((running.fullPath as unknown as Record<string, string>).en).toBe("/shoes/running");
    expect((running.fullPath as unknown as Record<string, string>).de).toBe("/schuhe/laufschuhe");
    // Created under products, moved to the top level.
    expect(shoes.parent).toBeNull();
    expect(
      await findRedirect(payload, { locale: "en", path: "/products/shoes/running/fast-runner" })
    ).toMatchObject({ to: "/shoes/running/fast-runner" });
  });

  it("/about/contact redirects to /company/contact", async () => {
    const { payload } = harness;

    expect(await findRedirect(payload, { locale: "en", path: "/about/contact" })).toMatchObject({
      status: 301,
      to: "/company/contact",
    });
    expect(await findRedirect(payload, { locale: "de", path: "/ueber-uns/kontakt" })).toMatchObject(
      { to: "/unternehmen/kontakt" }
    );
    // Only the moves and the rename wrote rows: the seed's own setup writes none.
    const { docs } = await payload.find({
      collection: "folder-redirects",
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
    });
    expect(docs.map((row) => row.lookupKey).sort()).toEqual([
      "de:/produkte/schuhe",
      "de:/ueber-uns",
      "en:/about",
      "en:/products/shoes",
    ]);
  });

  it("blog is aktuelles in de", async () => {
    const { payload } = harness;
    const folders = await readFolders(payload);
    const blog = folders.find((folder) => folder.id === summary.folders.blog) as FolderRow;

    expect(blog.slug).toMatchObject({ de: "aktuelles", en: "blog" });
    expect(blog.fullPath).toMatchObject({ de: "/aktuelles", en: "/blog" });
    const team = await payload.find({
      collection: "pages",
      depth: 0,
      locale: "de",
      overrideAccess: true,
      where: { folder: { equals: summary.folders.blog } },
    });
    expect(team.docs.map((page) => page.fullPath)).toContain("/aktuelles/team");
    expect(team.docs.map((page) => page.fullPath)).toContain("/aktuelles/hallo-welt");
  });

  it("creates a user for every role", async () => {
    const { payload } = harness;
    const { docs } = await payload.find({
      collection: "users",
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
    });
    const roles = new Set(docs.map((user) => (user as unknown as { role: string }).role));
    expect(roles).toEqual(new Set(["admin", "editor", "drafter", "editorLimited"]));
    expect(seededUsers.map((user) => user.role).sort()).toEqual([
      "drafter",
      "editor",
      "editorLimited",
    ]);
    const limited = docs.find(
      (user) => (user as unknown as { role: string }).role === "editorLimited"
    ) as unknown as { limitedFolder: number };
    expect(limited.limitedFolder).toBe(summary.folders.blog);
  });

  it("shows a draft, a published and a changed page in the tree", async () => {
    const { payload } = harness;
    const { docs } = await payload.find({
      collection: "pages",
      depth: 0,
      draft: true,
      limit: 0,
      overrideAccess: true,
      pagination: false,
    });
    const statuses = new Set(docs.map((page) => (page as unknown as { _status: string })._status));
    expect(statuses).toEqual(new Set(["draft", "published"]));
    expect(docs.some((page) => String(page.title).includes("(next version)"))).toBe(true);
  });

  it("a second run changes nothing", async () => {
    const { payload } = harness;
    const before = await snapshotDatabase(payload);

    const again = await seedSandboxTree(payload);
    const after = await snapshotDatabase(payload);

    expect(again.folders).toEqual(summary.folders);
    expect(after).toEqual(before);
  });

  it(
    "SEED_LARGE adds 2,000 pages",
    async () => {
      // Its own database, so no other case depends on whether it ran before or after.
      const largeHarness = await getTestPayload();
      try {
        await assertLargeSeed(largeHarness.payload);
      } finally {
        await largeHarness.destroy();
      }
    },
    largeSeedTimeoutMs
  );
});
