import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { planMove, summarizePageChanges } from "../../src/core/move.js";
import type { MovePreview } from "../../src/core/move.js";
import type { MoveResult } from "../../src/server/index.js";
import type { PathChange } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { countDbWrites } from "../helpers/countDbWrites.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";
import { createFolder, createTestRequest } from "../helpers/treeFixtures.js";

type SegmentResult = { message?: string; ok: boolean };

type ErrorBody = {
  errors: Array<{
    data?: { blocked?: unknown[]; item?: unknown; reason?: string };
    message: string;
  }>;
};

const recordedChanges: PathChange[][] = [];

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({
    foldersOptions: {
      hooks: {
        afterPathChange: ({ changes }) => {
          recordedChanges.push(changes);
        },
      },
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  recordedChanges.length = 0;
  await clearTree(harness.payload);
});

const pageRef = (id: number) => ({ collection: "pages", id });
const folderRef = (id: number) => ({ collection: "folders", id });

const post = <TBody>(path: string, body: unknown, anonymous = false) =>
  callEndpoint<TBody>({
    anonymous,
    body,
    config: harness.config,
    method: "POST",
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

const get = <TBody>(path: string, anonymous = false) =>
  callEndpoint<TBody>({
    anonymous,
    config: harness.config,
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

type PageStructure = { folder: number | null; orderKey: string | null; structureRevision: number };

const readStructure = async (payload: Payload, id: number): Promise<PageStructure> => {
  const row = (await payload.db.findOne({
    collection: "pages",
    where: { id: { equals: id } },
  })) as unknown as PageStructure;

  return {
    folder: row.folder,
    orderKey: row.orderKey,
    structureRevision: row.structureRevision,
  };
};

const readTreeRevision = async (payload: Payload): Promise<number> =>
  (
    (await payload.db.findGlobal({ slug: "folders-tree-state" as never })) as {
      revision?: number | null;
    }
  ).revision ?? 0;

describe("POST /folders-tree/move", () => {
  it("POST move returns MoveResult", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const before = await readStructure(payload, tree.pages.contact.id);
    const revisionBefore = await readTreeRevision(payload);

    const { body, status } = await post<MoveResult>("/folders-tree/move", {
      items: [
        {
          ...pageRef(tree.pages.contact.id),
          expected: { orderKey: before.orderKey, parentId: tree.about.id },
        },
      ],
      toFolder: tree.blog.id,
    });

    expect(status).toBe(200);
    const key = `pages:${tree.pages.contact.id}`;
    expect(body.moved).toEqual([pageRef(tree.pages.contact.id)]);
    expect(body.orderKeys[key]).toEqual(expect.any(String));
    expect(body.structureRevisions).toEqual({ [key]: before.structureRevision + 1 });
    expect(body.revision).toBe(revisionBefore + 1);
    expect(body.changes).toContainEqual({
      collection: "pages",
      from: "/about/contact",
      id: tree.pages.contact.id,
      kind: "page",
      locale: "en",
      published: true,
      to: "/blog/contact",
    });
    expect(await readStructure(payload, tree.pages.contact.id)).toEqual({
      folder: tree.blog.id,
      orderKey: body.orderKeys[key],
      structureRevision: before.structureRevision + 1,
    });
    expect(await readTreeRevision(payload)).toBe(body.revision);
  });

  it("accepts ids as the numeric strings a form sends", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body, status } = await post<MoveResult>("/folders-tree/move", {
      items: [{ collection: "pages", id: String(tree.pages.contact.id) }],
      toFolder: String(tree.blog.id),
    });

    expect(status).toBe(200);
    expect(body.moved).toEqual([pageRef(tree.pages.contact.id)]);
    expect((await readStructure(payload, tree.pages.contact.id)).folder).toBe(tree.blog.id);
  });

  it("POST move with both toFolder and after is 400", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const before = await readStructure(payload, tree.pages.contact.id);

    const both = await post<ErrorBody>("/folders-tree/move", {
      after: folderRef(tree.blog.id),
      items: [pageRef(tree.pages.contact.id)],
      toFolder: tree.blog.id,
    });
    const neither = await post<ErrorBody>("/folders-tree/move", {
      items: [pageRef(tree.pages.contact.id)],
    });

    expect(both.status).toBe(400);
    expect(both.body.errors[0].message).toBe("Name the target with either `toFolder` or `after`");
    expect(neither.status).toBe(400);
    expect(await readStructure(payload, tree.pages.contact.id)).toEqual(before);
  });

  it("answers 400, not 409, for toFolder 0 and for an after item that is selected", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const before = await readStructure(payload, tree.pages.contact.id);

    const zero = await post<ErrorBody>("/folders-tree/move", {
      items: [pageRef(tree.pages.contact.id)],
      toFolder: 0,
    });
    const selectedAfter = await post<ErrorBody>("/folders-tree/move", {
      after: pageRef(tree.pages.contact.id),
      items: [pageRef(tree.pages.contact.id)],
    });

    expect(zero.status).toBe(400);
    expect(zero.body.errors[0].message).toContain("0 is not a folder");
    expect(selectedAfter.status).toBe(400);
    expect(selectedAfter.body.errors[0].message).toContain("cannot be part of the selection");
    expect(await readStructure(payload, tree.pages.contact.id)).toEqual(before);
  });

  it("refuses a malformed body, an unknown collection and a bad id with 400", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const contact = pageRef(tree.pages.contact.id);

    const bodies: unknown[] = [
      { items: [], toFolder: null },
      { items: contact, toFolder: null },
      { items: [{ collection: "users", id: 1 }], toFolder: null },
      { items: [{ collection: "pages", id: "abc" }], toFolder: null },
      { items: [{ collection: "pages", id: 0 }], toFolder: null },
      { items: [contact], toFolder: { id: 1 } },
      { items: [contact], position: "middle", toFolder: null },
      { items: [contact], position: "end", after: folderRef(tree.blog.id) },
      { items: [contact], redirects: "yes", toFolder: null },
      { items: [{ ...contact, expected: { parentId: null } }], toFolder: null },
      "just text",
    ];
    for (const body of bodies) {
      const { status } = await post<ErrorBody>("/folders-tree/move", body);
      expect(status, JSON.stringify(body)).toBe(400);
    }
    const invalidJson = await callEndpoint<ErrorBody>({
      body: undefined,
      config: harness.config,
      method: "POST",
      path: "/folders-tree/move",
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(invalidJson.status).toBe(400);
  });

  it("a stale expected is 409 with reason stale", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const before = await readStructure(payload, tree.pages.contact.id);
    const expected = { orderKey: before.orderKey, parentId: tree.about.id };

    const first = await post<MoveResult>("/folders-tree/move", {
      items: [{ ...pageRef(tree.pages.contact.id), expected }],
      toFolder: tree.blog.id,
    });
    const second = await post<ErrorBody>("/folders-tree/move", {
      items: [{ ...pageRef(tree.pages.contact.id), expected }],
      toFolder: tree.about.id,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.errors[0].message).toBe(
      "This part of the tree changed. Reload and try again."
    );
    expect(second.body.errors[0].data).toMatchObject({
      item: pageRef(tree.pages.contact.id),
      reason: "stale",
    });
    expect((await readStructure(payload, tree.pages.contact.id)).folder).toBe(tree.blog.id);
  });

  it("answers a path conflict with 409 and a cycle with 400, and writes nothing", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await payload.create({
      collection: "pages",
      data: {
        _status: "published",
        folder: tree.blog.id,
        slug: "contact",
        title: "Other",
      } as never,
      depth: 0,
      overrideAccess: true,
    });
    const revisionBefore = await readTreeRevision(payload);

    const conflict = await post<ErrorBody>("/folders-tree/move", {
      items: [pageRef(tree.pages.contact.id)],
      toFolder: tree.blog.id,
    });
    const cycle = await post<ErrorBody>("/folders-tree/move", {
      items: [folderRef(tree.about.id)],
      toFolder: tree.subfolders[0].id,
    });

    expect(conflict.status).toBe(409);
    expect(conflict.body.errors[0].data?.reason).toBe("conflict");
    expect(cycle.status).toBe(400);
    expect(cycle.body.errors[0].data?.reason).toBe("cycle");
    expect(await readTreeRevision(payload)).toBe(revisionBefore);
    expect((await readStructure(payload, tree.pages.contact.id)).folder).toBe(tree.about.id);
  });

  it("refuses a request without a user with 403", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const move = await post<ErrorBody>(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id },
      true
    );
    const preview = await post<ErrorBody>(
      "/folders-tree/move/preview",
      { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id },
      true
    );
    const folderPreview = await post<ErrorBody>(
      `/folders-tree/folders/${tree.about.id}/preview`,
      { slug: "company" },
      true
    );
    const revision = await get<ErrorBody>("/folders-tree/revision", true);
    const segment = await get<ErrorBody>("/folders-tree/check-segment?parent=root&segment=x", true);

    for (const result of [move, preview, folderPreview, revision, segment]) {
      expect(result.status).toBe(403);
    }
    expect((await readStructure(payload, tree.pages.contact.id)).folder).toBe(tree.about.id);
  });
});

describe("the planner behind the endpoints", () => {
  it("throws 400, not a stale 409, for toFolder 0 and a selected after item", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const request = await createTestRequest(payload);

    await expect(
      planMove(
        request,
        { items: [pageRef(tree.pages.contact.id)], toFolder: 0 },
        { overrideAccess: true }
      )
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      planMove(
        request,
        { after: pageRef(tree.pages.contact.id), items: [pageRef(tree.pages.contact.id)] },
        { overrideAccess: true }
      )
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("POST /folders-tree/move/preview", () => {
  it("move preview writes nothing", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const before = await readStructure(payload, tree.pages.contact.id);
    const revisionBefore = await readTreeRevision(payload);

    const { result, writes } = await countDbWrites(payload, () =>
      post<MovePreview>("/folders-tree/move/preview", {
        items: [pageRef(tree.pages.contact.id)],
        toFolder: tree.blog.id,
      })
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.urlChanges.published).toBe(1);
    expect(result.body.samples).toContainEqual({
      collection: "pages",
      from: "/about/contact",
      id: tree.pages.contact.id,
      locale: "en",
      to: "/blog/contact",
    });
    // Signing in writes the user's session; nothing in the tree may be written.
    expect(writes.filter((write) => write.collection !== "users")).toEqual([]);
    expect(await readStructure(payload, tree.pages.contact.id)).toEqual(before);
    expect(await readTreeRevision(payload)).toBe(revisionBefore);
    expect(recordedChanges).toEqual([]);
  });

  it("answers a blocked move with 200, ok false and the reasons", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body, status } = await post<MovePreview>("/folders-tree/move/preview", {
      items: [folderRef(tree.about.id)],
      toFolder: tree.subfolders[0].id,
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.blocked).toMatchObject([{ item: folderRef(tree.about.id), reason: "cycle" }]);
  });
});

describe("POST /folders-tree/folders/:id/preview", () => {
  it("folder preview counts URL changes of a rename", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const revisionBefore = await readTreeRevision(payload);

    const { result, writes } = await countDbWrites(payload, () =>
      post<MovePreview>(`/folders-tree/folders/${tree.about.id}/preview`, { slug: "company" })
    );
    const { body, status } = result;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    // contact, the root page about-us and the post timeline are live; members is a draft.
    expect(body.urlChanges.published).toBe(3);
    expect(body.urlChanges.draftOnly).toBe(1);
    expect(body.foldersRewritten).toBe(3);
    expect(body.redirectRowsToWrite).toBeGreaterThan(0);
    expect(body.samples).toContainEqual({
      collection: "pages",
      from: "/about/contact",
      id: tree.pages.contact.id,
      locale: "en",
      to: "/company/contact",
    });
    expect(writes.filter((write) => write.collection !== "users")).toEqual([]);
    expect(await readTreeRevision(payload)).toBe(revisionBefore);

    // The same numbers the rename reports once it is saved.
    await payload.update({
      collection: "folders",
      data: { slug: "company" },
      id: tree.about.id,
      locale: "en",
      overrideAccess: true,
    });
    const savedChanges = recordedChanges.flat();
    expect(summarizePageChanges(savedChanges).urlChanges).toEqual(body.urlChanges);
    expect(
      savedChanges.filter((change) => change.kind === "folder" && change.id === tree.about.id)
        .length
    ).toBe(body.redirectRowsToWrite);
  });

  it("previews a rename in one locale", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body } = await post<MovePreview>(`/folders-tree/folders/${tree.about.id}/preview`, {
      locale: "de",
      slug: "ueber-uns",
    });

    expect(body.ok).toBe(true);
    expect(body.samples.every((sample) => sample.locale === "de")).toBe(true);
    expect(body.samples).toContainEqual(
      expect.objectContaining({ from: "/about/contact", to: "/ueber-uns/contact" })
    );
  });

  it("blocks a rename onto a taken path, an invalid segment and a reserved one", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const preview = (slug: string) =>
      post<MovePreview>(`/folders-tree/folders/${tree.about.id}/preview`, { slug });

    const taken = await preview("blog");
    const invalid = await preview("Not Valid");
    const reserved = await preview("admin");

    expect(taken.body.ok).toBe(false);
    expect(taken.body.blocked[0].reason).toBe("conflict");
    expect(taken.body.blocked[0].message).toContain("/blog is already used by another folder");
    expect(invalid.body.blocked[0].reason).toBe("reserved");
    expect(reserved.body.blocked[0].message).toBe("/admin is used by the site itself");
    expect(taken.body.urlChanges.published).toBe(0);
  });

  it("blocks a rename onto a segment a page of the parent folder uses", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body } = await post<MovePreview>(
      `/folders-tree/folders/${tree.subfolders[0].id}/preview`,
      {
        slug: "contact",
      }
    );

    expect(body.ok).toBe(false);
    expect(body.blocked[0]).toMatchObject({ reason: "conflict" });
    expect(body.blocked[0].message).toContain("/about/contact is already used by");
  });

  it("previews a parent change as a move and refuses a rename in the same edit", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const [team] = tree.subfolders;

    const move = await post<MovePreview>(`/folders-tree/folders/${team.id}/preview`, {
      parent: tree.blog.id,
    });
    const both = await post<ErrorBody>(`/folders-tree/folders/${team.id}/preview`, {
      parent: tree.blog.id,
      slug: "crew",
    });
    const unchanged = await post<MovePreview>(`/folders-tree/folders/${team.id}/preview`, {});

    expect(move.status).toBe(200);
    expect(move.body.targetFolderId).toBe(tree.blog.id);
    expect(move.body.urlChanges.draftOnly).toBe(1);
    expect(move.body.samples).toContainEqual(
      expect.objectContaining({ from: "/about/team/members", to: "/blog/team/members" })
    );
    expect(both.status).toBe(400);
    expect(unchanged.body).toMatchObject({ ok: true, urlChanges: { published: 0 } });
  });

  it("answers 404 for a folder that does not exist and 400 for a bad parent", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const missing = await post<ErrorBody>("/folders-tree/folders/999999/preview", { slug: "x" });
    const zero = await post<ErrorBody>(`/folders-tree/folders/${tree.about.id}/preview`, {
      parent: 0,
    });
    const badLocale = await post<ErrorBody>(`/folders-tree/folders/${tree.about.id}/preview`, {
      locale: "fr",
      slug: "x",
    });
    const badId = await post<ErrorBody>("/folders-tree/folders/abc/preview", { slug: "x" });

    expect(missing.status).toBe(404);
    expect(zero.status).toBe(400);
    expect(badLocale.status).toBe(400);
    expect(badId.status).toBe(400);
  });
});

describe("GET /folders-tree/check-segment", () => {
  const check = (query: string) => get<SegmentResult>(`/folders-tree/check-segment?${query}`);

  it("check-segment reports a taken segment", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const takenPage = await check(`parent=${tree.about.id}&segment=contact`);
    const takenFolder = await check("parent=root&segment=about");
    const free = await check(`parent=${tree.about.id}&segment=brand-new`);

    expect(takenPage.body).toEqual({
      message: "/about/contact is already used by Contact",
      ok: false,
    });
    expect(takenFolder.body).toEqual({ message: "/about is already used by a folder", ok: false });
    expect(free.body).toEqual({ ok: true });
  });

  it("counts a draft page, because the draft warning of the edit view builds on it", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body } = await check(`parent=${tree.subfolders[0].id}&segment=members`);

    expect(body.ok).toBe(false);
    expect(body.message).toBe("/about/team/members is already used by Members");
  });

  it("finds a page that only has the default locale's segment in another locale", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body } = await check(`parent=${tree.about.id}&segment=contact&locale=de`);

    expect(body).toEqual({ message: "/about/contact is already used by Contact", ok: false });
  });

  it("does not count the item being edited against itself", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const page = await check(
      `parent=${tree.about.id}&segment=contact&exclude[collection]=pages&exclude[id]=${tree.pages.contact.id}`
    );
    const folder = await check(
      `parent=root&segment=about&exclude[collection]=folders&exclude[id]=${tree.about.id}`
    );
    const shortForm = await check(
      `parent=${tree.about.id}&segment=contact&exclude=pages:${tree.pages.contact.id}`
    );

    expect(page.body).toEqual({ ok: true });
    expect(folder.body).toEqual({ ok: true });
    expect(shortForm.body).toEqual({ ok: true });
  });

  it("refuses an invalid or reserved segment and a bad request", async () => {
    const { payload } = harness;
    await seedTree(payload);

    const invalid = await check("parent=root&segment=Not%20Valid");
    const reserved = await check("parent=root&segment=admin");
    const dotted = await check("parent=root&segment=robots.txt");
    const missingSegment = await check("parent=root");
    const missingParent = await check("segment=x");
    const badLocale = await check("parent=root&segment=x&locale=fr");
    const missingFolder = await check("parent=999999&segment=x");

    expect(invalid.body.ok).toBe(false);
    expect(reserved.body).toEqual({ message: "/admin is used by the site itself", ok: false });
    expect(dotted.body.ok).toBe(false);
    expect(missingSegment.status).toBe(400);
    expect(missingParent.status).toBe(400);
    expect(badLocale.status).toBe(400);
    expect(missingFolder.status).toBe(404);
  });
});

describe("GET /folders-tree/revision", () => {
  it("revision increases after a move", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const stored = await readTreeRevision(payload);
    const before = await get<{ revision: number }>("/folders-tree/revision");
    const moved = await post<MoveResult>("/folders-tree/move", {
      items: [pageRef(tree.pages.contact.id)],
      toFolder: tree.blog.id,
    });
    const after = await get<{ revision: number }>("/folders-tree/revision");

    expect(before.status).toBe(200);
    expect(before.body.revision).toBe(stored);
    expect(after.body.revision).toBe(moved.body.revision);
    expect(after.body.revision).toBeGreaterThan(before.body.revision);
  });
});

describe("without localization", () => {
  it("previews, checks and moves on an app with plain columns", async () => {
    const plain = await getTestPayload({ localized: false });
    try {
      const { payload } = plain;
      const docs = await createFolder(payload, { slug: "docs" });
      const archive = await createFolder(payload, { slug: "archive" });
      const guide = await payload.create({
        collection: "pages",
        data: { _status: "published", folder: docs.id, slug: "guide", title: "Guide" } as never,
        depth: 0,
        overrideAccess: true,
      });
      const call = <TBody>(method: "GET" | "POST", path: string, body?: unknown) =>
        callEndpoint<TBody>({
          body,
          config: plain.config,
          method,
          path,
          payload,
          payloadInstanceCacheKey: plain.cacheKey,
        });

      const preview = await call<MovePreview>("POST", `/folders-tree/folders/${docs.id}/preview`, {
        slug: "manual",
      });
      const taken = await call<SegmentResult>(
        "GET",
        `/folders-tree/check-segment?parent=${docs.id}&segment=guide`
      );
      const moved = await call<MoveResult>("POST", "/folders-tree/move", {
        items: [{ collection: "pages", id: guide.id }],
        toFolder: archive.id,
      });

      expect(preview.body.ok).toBe(true);
      expect(preview.body.urlChanges.published).toBe(1);
      expect(preview.body.samples).toEqual([
        {
          collection: "pages",
          from: "/docs/guide",
          id: guide.id,
          locale: null,
          to: "/manual/guide",
        },
      ]);
      expect(taken.body.ok).toBe(false);
      expect(moved.status).toBe(200);
      expect(moved.body.changes[0]).toMatchObject({
        from: "/docs/guide",
        locale: null,
        to: "/archive/guide",
      });
    } finally {
      await plain.destroy();
    }
  });
});
