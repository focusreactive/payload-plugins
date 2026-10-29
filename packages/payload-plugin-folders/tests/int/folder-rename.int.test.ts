import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { isTreeLockHeld } from "../../src/core/treeLock.js";
import type { PathChange, PathChangeReason } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { countDbWrites } from "../helpers/countDbWrites.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";
import type { SeededTree } from "../helpers/seedTree.js";
import { createFolder, createPage, createTestRequest } from "../helpers/treeFixtures.js";

type Recorded = { changes: PathChange[]; reason: PathChangeReason; requestUser: unknown };

const recorded: Recorded[] = [];
let hookBehaviour: (() => Promise<void> | void) | null = null;

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({
    foldersOptions: {
      hooks: {
        afterPathChange: async ({ changes, reason, req }) => {
          recorded.push({ changes, reason, requestUser: req.user });
          await hookBehaviour?.();
        },
      },
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  hookBehaviour = null;
  recorded.length = 0;
  vi.restoreAllMocks();
  await clearTree(harness.payload);
});

type FolderAllLocales = {
  ancestorIds: string | null;
  fullPath: Record<string, string>;
  name: Record<string, string>;
  slug: Record<string, string>;
};

const readAllLocales = async (payload: Payload, id: number): Promise<FolderAllLocales> =>
  (await payload.findByID({
    collection: "folders",
    depth: 0,
    id,
    locale: "all",
    overrideAccess: true,
  })) as unknown as FolderAllLocales;

const renameFolder = (
  payload: Payload,
  id: number,
  data: { name?: string; slug?: string },
  locale: "de" | "en" = "en"
) =>
  payload.update({
    collection: "folders",
    data,
    depth: 0,
    id,
    locale,
    overrideAccess: true,
  });

const readFullPath = async (
  payload: Payload,
  collection: "pages" | "posts",
  id: number,
  locale: "de" | "en" = "en"
): Promise<string | null | undefined> =>
  (
    (await payload.findByID({
      collection,
      depth: 0,
      draft: true,
      id,
      locale,
      overrideAccess: true,
    })) as unknown as { fullPath?: string | null }
  ).fullPath;

const pageChanges = (changes: PathChange[]) => changes.filter((change) => change.kind === "page");
const folderChanges = (changes: PathChange[]) =>
  changes.filter((change) => change.kind === "folder");

describe("folder rename", () => {
  it("rename about to company moves /about/contact to /company/contact", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    expect(await readFullPath(payload, "pages", tree.pages.contact.id)).toBe("/about/contact");

    await renameFolder(payload, tree.about.id, { name: "Company", slug: "company" });

    expect(await readFullPath(payload, "pages", tree.pages.contact.id)).toBe("/company/contact");
    // The root page's URL is the folder's path itself.
    expect(await readFullPath(payload, "pages", tree.pages["about-us"].id)).toBe("/company");
    expect(await readFullPath(payload, "pages", tree.pages.members.id)).toBe(
      "/company/team/members"
    );
    expect(await readFullPath(payload, "posts", tree.pages.timeline.id)).toBe(
      "/company/history/timeline"
    );
    const [team] = tree.subfolders;
    expect((await readAllLocales(payload, team.id)).fullPath).toEqual({
      de: "/company/team",
      en: "/company/team",
    });
    expect((await readAllLocales(payload, team.id)).ancestorIds).toBe(`/${tree.about.id}/`);
    // The sibling tree is untouched.
    expect(await readFullPath(payload, "pages", tree.blogPost.id)).toBe("/blog/post");

    expect(recorded).toHaveLength(1);
    expect(recorded[0].reason).toBe("folderUpdate");
    const contactChanges = pageChanges(recorded[0].changes).filter(
      (change) => change.id === tree.pages.contact.id && change.collection === "pages"
    );
    expect(contactChanges).toContainEqual({
      collection: "pages",
      from: "/about/contact",
      id: tree.pages.contact.id,
      kind: "page",
      locale: "en",
      published: true,
      to: "/company/contact",
    });
  });

  it("a de rename touches only de", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const [team] = tree.subfolders;

    await renameFolder(payload, tree.about.id, { name: "Ueber uns", slug: "ueber-uns" }, "de");

    expect((await readAllLocales(payload, tree.about.id)).fullPath).toEqual({
      de: "/ueber-uns",
      en: "/about",
    });
    expect((await readAllLocales(payload, team.id)).fullPath).toEqual({
      de: "/ueber-uns/team",
      en: "/about/team",
    });
    expect(await readFullPath(payload, "pages", tree.pages.contact.id, "en")).toBe(
      "/about/contact"
    );
    expect(await readFullPath(payload, "pages", tree.pages.contact.id, "de")).toBe(
      "/ueber-uns/contact"
    );

    expect(recorded).toHaveLength(1);
    const { changes } = recorded[0];
    expect(changes.length).toBeGreaterThan(0);
    expect(new Set(changes.map((change) => change.locale))).toEqual(new Set(["de"]));
  });

  it("an en rename moves the de path too while de has no slug of its own", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    await renameFolder(payload, tree.about.id, { name: "Company", slug: "company" });

    expect(await readFullPath(payload, "pages", tree.pages.contact.id, "de")).toBe(
      "/company/contact"
    );
    const localesOfContact = pageChanges(recorded[0].changes)
      .filter((change) => change.id === tree.pages.contact.id && change.collection === "pages")
      .map((change) => change.locale)
      .sort();
    expect(localesOfContact).toEqual(["de", "en"]);
  });

  it("every reported change has from different from to", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    // A de slug of its own for one subfolder, so a rename leaves its en path alone but moves de.
    const [team] = tree.subfolders;
    await renameFolder(payload, team.id, { name: "Team de", slug: "mannschaft" }, "de");
    recorded.length = 0;

    await renameFolder(payload, tree.about.id, { name: "Company", slug: "company" });

    const { changes } = recorded[0];
    expect(changes.length).toBeGreaterThan(0);
    for (const change of changes) {
      expect(change.from).not.toBe(change.to);
    }
    // Folders and pages are both reported, and a draft is marked unpublished.
    expect(folderChanges(changes).length).toBeGreaterThan(0);
    expect(
      pageChanges(changes).find((change) => change.id === tree.pages.members.id)?.published
    ).toBe(false);
    expect(
      pageChanges(changes).find((change) => change.id === tree.pages.contact.id)?.published
    ).toBe(true);
  });

  it("en values survive a de rename", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const [team] = tree.subfolders;
    await renameFolder(payload, team.id, { name: "Teamarbeit", slug: "teamarbeit" }, "de");

    await renameFolder(payload, tree.about.id, { name: "Firma", slug: "firma" }, "de");
    await renameFolder(payload, team.id, { name: "Mannschaft" }, "de");

    const storedTeam = await readAllLocales(payload, team.id);
    expect(storedTeam.name).toEqual({ de: "Mannschaft", en: "Team" });
    expect(storedTeam.slug).toEqual({ de: "teamarbeit", en: "team" });
    expect(storedTeam.fullPath).toEqual({ de: "/firma/teamarbeit", en: "/about/team" });
    const storedAbout = await readAllLocales(payload, tree.about.id);
    expect(storedAbout.name).toEqual({ de: "Firma", en: "About" });
    expect(storedAbout.slug).toEqual({ de: "firma", en: "about" });
    expect(storedAbout.fullPath).toEqual({ de: "/firma", en: "/about" });
  });

  it("a de rename creates no de row for a descendant that has none", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const orphan = (await payload.db.create({
      collection: "folders",
      data: {
        ancestorIds: `/${tree.about.id}/`,
        depth: 2,
        fullPath: { en: "/about/legacy" },
        name: { en: "Legacy" },
        orderKey: "a0",
        parent: tree.about.id,
        slug: { en: "legacy" },
        structureRevision: 0,
      },
    })) as unknown as { id: number };

    await renameFolder(payload, tree.about.id, { name: "Firma", slug: "firma" }, "de");

    const stored = await readAllLocales(payload, orphan.id);
    expect(stored.fullPath).toEqual({ en: "/about/legacy" });
    expect(stored.name).toEqual({ en: "Legacy" });
    expect(stored.slug).toEqual({ en: "legacy" });
  });

  it("a failure part way through the subtree leaves nothing changed and reports nothing", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const [team] = tree.subfolders;
    const deepest = await createFolder(payload, { name: "Deep", parent: team.id, slug: "deep" });
    const before = {
      about: await readAllLocales(payload, tree.about.id),
      deepest: await readAllLocales(payload, deepest.id),
      team: await readAllLocales(payload, team.id),
    };

    // The deepest folder is written last, after its ancestors, so the failure comes part way.
    const original = payload.db.updateOne.bind(payload.db);
    vi.spyOn(payload.db, "updateOne").mockImplementation((args) => {
      if (args.collection === "folders" && args.id === deepest.id) {
        return Promise.reject(new Error("disk full"));
      }

      return original(args);
    });

    await expect(
      renameFolder(payload, tree.about.id, { name: "Company", slug: "company" })
    ).rejects.toThrow("disk full");
    vi.restoreAllMocks();

    expect(await readAllLocales(payload, tree.about.id)).toEqual(before.about);
    expect(await readAllLocales(payload, team.id)).toEqual(before.team);
    expect(await readAllLocales(payload, deepest.id)).toEqual(before.deepest);
    expect(await readFullPath(payload, "pages", tree.pages.contact.id)).toBe("/about/contact");
    expect(recorded).toEqual([]);
    expect(isTreeLockHeld(payload)).toBe(false);

    // The same rename works once the fault is gone.
    await renameFolder(payload, tree.about.id, { name: "Company", slug: "company" });
    expect(await readFullPath(payload, "pages", tree.pages.contact.id)).toBe("/company/contact");
  });

  it("a bulk update of folder slugs is refused", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Bulk", slug: "bulk-source" });

    await expect(
      payload.update({
        collection: "folders",
        data: { slug: "bulk-target" },
        depth: 0,
        overrideAccess: true,
        where: { id: { equals: folder.id } },
      })
    ).rejects.toMatchObject({ status: 400 });
    expect((await readAllLocales(payload, folder.id)).slug.en).toBe("bulk-source");
  });

  it("afterPathChange runs after the commit, with the lock free and a request of its own", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const observed: { isLockHeld?: boolean; pathSeenOutsideTransaction?: string } = {};
    hookBehaviour = async () => {
      observed.isLockHeld = isTreeLockHeld(payload);
      // A read on a request of its own sees only what was committed.
      const folder = (await payload.findByID({
        collection: "folders",
        depth: 0,
        id: tree.about.id,
        overrideAccess: true,
      })) as unknown as { fullPath: string };
      observed.pathSeenOutsideTransaction = folder.fullPath;
      // A host that writes to the tree from the hook must not wait for the save's own lock.
      await createFolder(payload, { name: "Created in hook", slug: "created-in-hook" });
    };

    await renameFolder(payload, tree.about.id, { name: "Company", slug: "company" });

    expect(observed).toEqual({ isLockHeld: false, pathSeenOutsideTransaction: "/company" });
  });

  it("a throw inside afterPathChange is logged and the save stands", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const logged = vi.spyOn(payload.logger, "error");
    hookBehaviour = () => {
      throw new Error("revalidation failed");
    };

    const saved = await renameFolder(payload, tree.about.id, { name: "Company", slug: "company" });

    expect(saved.fullPath).toBe("/company");
    expect((await readAllLocales(payload, tree.about.id)).fullPath.en).toBe("/company");
    expect(recorded).toHaveLength(1);
    expect(logged).toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining("hooks.afterPathChange threw") })
    );
    expect(isTreeLockHeld(payload)).toBe(false);
  });

  it("afterPathChange does not run for a save that changes no path", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    await renameFolder(payload, tree.about.id, { name: "About us" });

    expect(recorded).toEqual([]);
  });

  it("a rename leaves the caller's request context, locale and transaction alone", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const req = await createTestRequest(payload);
    const localeBefore = req.locale;

    await payload.update({
      collection: "folders",
      data: { name: "Company", slug: "company" },
      depth: 0,
      id: tree.about.id,
      overrideAccess: true,
      req,
    });

    // Payload's own bookkeeping key is the only one a save leaves on the request.
    expect(Object.keys(req.context)).toEqual(["_submittedAuthorshipFields"]);
    expect(req.context.foldersInternal).toBeUndefined();
    expect(req.locale).toBe(localeBefore);
    expect(req.transactionID).toBeUndefined();
    expect(recorded).toHaveLength(1);

    // The same request still validates: a page in a folder that does not exist is refused.
    await expect(
      payload.create({
        collection: "pages",
        data: { folder: 999_999, slug: "after-rename", title: "After" },
        depth: 0,
        overrideAccess: true,
        req,
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("a REST rename reports to afterPathChange with the signed-in user", async () => {
    const { config, payload } = harness;
    const tree = await seedTree(payload);

    const { status } = await callEndpoint({
      body: { name: "Company", slug: "company" },
      config,
      method: "PATCH",
      path: `/folders/${tree.about.id}`,
      payload,
    });

    expect(status).toBe(200);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].requestUser).toMatchObject({ email: "endpoint-tester@example.com" });
    expect(await readFullPath(payload, "pages", tree.pages.contact.id)).toBe("/company/contact");
  });

  it("a rename writes folder rows only, one per changed folder", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { writes } = await countDbWrites(payload, () =>
      renameFolder(payload, tree.about.id, { name: "Company", slug: "company" })
    );

    expect(
      writes.filter((write) => write.collection === "pages" || write.collection === "posts")
    ).toEqual([]);
    const descendantWrites = writes.filter(
      (write) =>
        write.collection === "folders" &&
        write.method === "updateOne" &&
        tree.subfolders.some((folder) => folder.id === write.id)
    );
    expect(descendantWrites).toHaveLength(tree.subfolders.length);
  });

  it("the page helper still creates a page in a renamed folder", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Moving", slug: "moving" });
    await renameFolder(payload, folder.id, { name: "Moved", slug: "moved" });

    const page = await createPage(payload, { folder: folder.id, slug: "inside", title: "Inside" });

    expect(await readFullPath(payload, "pages", page.id)).toBe("/moved/inside");
  });
});

describe("folder rename limits", () => {
  let limited: TestPayload;
  let tree: SeededTree;

  beforeAll(async () => {
    limited = await getTestPayload({ foldersOptions: { limits: { maxFoldersPerMove: 3 } } });
    tree = await seedTree(limited.payload);
  });

  afterAll(async () => {
    await limited?.destroy();
  });

  it("a rename over maxFoldersPerMove is refused", async () => {
    const { payload } = limited;
    // about, team and history are 3 rows: at the limit. One more subfolder makes it 4.
    await createFolder(payload, { name: "Extra", parent: tree.about.id, slug: "extra" });
    const before = await readAllLocales(payload, tree.about.id);

    const failure = await renameFolder(payload, tree.about.id, {
      name: "Company",
      slug: "company",
    }).catch((error: unknown) => error as { data?: { errors?: unknown[] }; status?: number });

    expect(failure).toMatchObject({ status: 400 });
    expect(JSON.stringify((failure as { data?: unknown }).data)).toContain(
      "would rewrite 4 folders; the limit is 3"
    );
    expect(await readAllLocales(payload, tree.about.id)).toEqual(before);
  });

  it("a rename at maxFoldersPerMove goes through", async () => {
    const { payload } = limited;
    const small = await createFolder(payload, { name: "Small", slug: "small" });
    await createFolder(payload, { name: "One", parent: small.id, slug: "one" });
    await createFolder(payload, { name: "Two", parent: small.id, slug: "two" });

    const saved = await renameFolder(payload, small.id, { name: "Bigger", slug: "bigger" });

    expect(saved.fullPath).toBe("/bigger");
  });
});

describe("folder rename without transactions", () => {
  const reportedWithoutTransactions: PathChange[][] = [];
  let untransacted: TestPayload;

  beforeAll(async () => {
    untransacted = await getTestPayload({
      foldersOptions: {
        hooks: {
          afterPathChange: ({ changes }) => {
            reportedWithoutTransactions.push(changes);
          },
        },
      },
      sqliteTransactions: false,
    });
  });

  afterAll(async () => {
    await untransacted?.destroy();
  });

  // Postgres always has transactions, so this adapter setup only exists on SQLite.
  it("afterPathChange still runs once the save is written", async ({ skip }) => {
    if (untransacted.databaseKind !== "sqlite") {
      skip();
    }
    const { payload } = untransacted;
    const tree = await seedTree(payload);

    await renameFolder(payload, tree.about.id, { name: "Company", slug: "company" });

    expect(reportedWithoutTransactions).toHaveLength(1);
    expect(await readFullPath(payload, "pages", tree.pages.contact.id)).toBe("/company/contact");
    expect(isTreeLockHeld(payload)).toBe(false);
  });
});
