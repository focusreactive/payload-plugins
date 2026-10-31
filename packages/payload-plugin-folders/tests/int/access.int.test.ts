import { createPayloadRequest } from "payload";
import type { Payload, PayloadRequest } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { canRepairTree, getItemAccess } from "../../src/core/access.js";
import { MoveBlockedError } from "../../src/core/move.js";
import type { MovePreview } from "../../src/core/move.js";
import { getResolvedOptions } from "../../src/core/runtime.js";
import { moveItems } from "../../src/server/index.js";
import type { MoveResult } from "../../src/server/index.js";
import type { ItemRef } from "../../src/types.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { countDbWrites } from "../helpers/countDbWrites.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";
import type { SeededTree } from "../helpers/seedTree.js";

type ErrorBody = {
  errors: Array<{
    data?: { blocked?: Array<{ item: ItemRef; message: string; reason: string }>; reason?: string };
    message: string;
  }>;
};

type MoveGateArguments = { items: ItemRef[]; toFolder: number | string | null; user: unknown };

const password = "test-password";
const userEmail = (role: string) => `${role.toLowerCase()}@access.example.com`;

let harness: TestPayload;
let moveGate: (args: MoveGateArguments) => boolean = () => true;
const moveGateCalls: MoveGateArguments[] = [];

beforeAll(async () => {
  harness = await getTestPayload({
    foldersOptions: {
      access: {
        move: ({ items, req, toFolder }) => {
          const args = { items, toFolder, user: (req.user as { email?: string } | null)?.email };
          moveGateCalls.push(args);

          return moveGate(args);
        },
      },
    },
  });
  for (const role of ["admin", "drafter", "editor", "editorLimited"]) {
    await harness.payload.create({
      collection: "users",
      data: { email: userEmail(role), password, role } as never,
      overrideAccess: true,
    });
  }
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  moveGate = () => true;
  moveGateCalls.length = 0;
  await clearTree(harness.payload);
});

const pageRef = (id: number) => ({ collection: "pages", id });
const folderRef = (id: number) => ({ collection: "folders", id });

const as = (role: "admin" | "drafter" | "editor" | "editorLimited") => ({
  email: userEmail(role),
  password,
});

const post = <TBody>(path: string, body: unknown, user: { email: string; password: string }) =>
  callEndpoint<TBody>({
    body,
    config: harness.config,
    method: "POST",
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    user,
  });

const postAnonymously = <TBody>(path: string, body: unknown) =>
  callEndpoint<TBody>({
    anonymous: true,
    body,
    config: harness.config,
    method: "POST",
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

const readUser = async (role: string) =>
  (
    await harness.payload.find({
      collection: "users",
      depth: 0,
      overrideAccess: true,
      where: { email: { equals: userEmail(role) } },
    })
  ).docs[0];

/** The limited user works inside `folderId` and everything beneath it. */
const tieLimitedUserTo = async (folderId: number) => {
  await harness.payload.update({
    collection: "users",
    data: { limitedFolder: folderId } as never,
    id: (await readUser("editorLimited")).id,
    overrideAccess: true,
  });
};

type Structure = { folder: number | null; orderKey: string | null; structureRevision: number };

const readStructure = async (
  payload: Payload,
  collection: "folders" | "pages" | "posts",
  id: number
): Promise<Structure> => {
  const row = (await payload.db.findOne({
    collection,
    where: { id: { equals: id } },
  })) as unknown as Structure & { parent?: number | null };

  return {
    folder: collection === "folders" ? (row.parent ?? null) : row.folder,
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

const createRequestFor = async (role: string): Promise<PayloadRequest> =>
  createPayloadRequest({
    payload: harness.payload,
    req: {},
    user: { ...(await readUser(role)), collection: "users" } as never,
  });

const seed = async (): Promise<SeededTree> => seedTree(harness.payload);

describe("access control on moves", () => {
  it("anonymous can read folders but not move", async () => {
    const { payload } = harness;
    const tree = await seed();
    const before = await readStructure(payload, "pages", tree.pages.contact.id);

    const read = await callEndpoint<{ docs: Array<{ id: number }> }>({
      anonymous: true,
      config: harness.config,
      path: "/folders",
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    const rest = await postAnonymously<ErrorBody>("/folders-tree/move", {
      items: [pageRef(tree.pages.contact.id)],
      toFolder: tree.blog.id,
    });
    const local = await moveItems(payload, {
      items: [pageRef(tree.pages.contact.id)],
      toFolder: tree.blog.id,
    }).catch((error: unknown) => error);

    expect(read.status).toBe(200);
    expect(read.body.docs.map((folder) => folder.id)).toContain(tree.about.id);
    expect(rest.status).toBe(403);
    expect(local).toBeInstanceOf(MoveBlockedError);
    expect(local).toMatchObject({ data: { reason: "forbidden" }, status: 403 });
    expect(await readStructure(payload, "pages", tree.pages.contact.id)).toEqual(before);
  });

  it("a user without update on one item gets 403 and nothing moves", async () => {
    const { payload } = harness;
    const tree = await seed();
    await tieLimitedUserTo(tree.about.id);
    const [team] = tree.subfolders;
    const ownPage = tree.pages.contact;
    const outsidePage = tree.blogPost;
    const before = {
      outside: await readStructure(payload, "pages", outsidePage.id),
      own: await readStructure(payload, "pages", ownPage.id),
    };
    const revisionBefore = await readTreeRevision(payload);

    const { result, writes } = await countDbWrites(payload, () =>
      post<ErrorBody>(
        "/folders-tree/move",
        { items: [pageRef(ownPage.id), pageRef(outsidePage.id)], toFolder: team.id },
        as("editorLimited")
      )
    );

    expect(result.status).toBe(403);
    expect(result.body.errors[0].data?.reason).toBe("forbidden");
    // Only the page the limited user cannot touch is named; the other one is fine.
    expect(result.body.errors[0].data?.blocked?.map((block) => block.item)).toEqual([
      pageRef(outsidePage.id),
    ]);
    expect(await readStructure(payload, "pages", ownPage.id)).toEqual(before.own);
    expect(await readStructure(payload, "pages", outsidePage.id)).toEqual(before.outside);
    expect(await readTreeRevision(payload)).toBe(revisionBefore);
    expect(writes.filter((write) => write.collection !== "users")).toEqual([]);
  });

  it("a drafter cannot move a published page", async () => {
    const { payload } = harness;
    const tree = await seed();
    const before = await readStructure(payload, "pages", tree.pages.contact.id);

    const { body, status } = await post<ErrorBody>(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id },
      as("drafter")
    );

    expect(status).toBe(403);
    expect(body.errors[0].data?.blocked).toEqual([
      {
        item: pageRef(tree.pages.contact.id),
        message: "Moving this item changes a live URL: you need publish rights",
        reason: "forbidden",
      },
    ]);
    expect(await readStructure(payload, "pages", tree.pages.contact.id)).toEqual(before);
  });

  it("a drafter can move a never-published page", async () => {
    const { payload } = harness;
    const tree = await seed();

    const { body, status } = await post<MoveResult>(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.members.id)], toFolder: tree.blog.id },
      as("drafter")
    );

    expect(status).toBe(200);
    expect(body.moved).toEqual([pageRef(tree.pages.members.id)]);
    expect((await readStructure(payload, "pages", tree.pages.members.id)).folder).toBe(
      tree.blog.id
    );
  });

  it("a drafter can reorder a published page inside its folder, because no URL changes", async () => {
    const { payload } = harness;
    const tree = await seed();

    const { status } = await post<MoveResult>(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.contact.id)], position: "end", toFolder: tree.about.id },
      as("drafter")
    );

    expect(status).toBe(200);
    expect((await readStructure(payload, "pages", tree.pages.contact.id)).folder).toBe(
      tree.about.id
    );
  });

  it("a drafter needs publish rights for a folder only when published pages sit beneath it", async () => {
    const { payload } = harness;
    const tree = await seed();
    const [team, history] = tree.subfolders;

    // team holds only a draft page, history a post (a collection without drafts is always live),
    // and about holds published pages.
    const draftsOnly = await post<MoveResult>(
      "/folders-tree/move",
      { items: [folderRef(team.id)], toFolder: tree.blog.id },
      as("drafter")
    );
    const withLivePost = await post<ErrorBody>(
      "/folders-tree/move",
      { items: [folderRef(history.id)], toFolder: tree.blog.id },
      as("drafter")
    );
    const withLivePages = await post<ErrorBody>(
      "/folders-tree/move",
      { items: [folderRef(tree.about.id)], toFolder: tree.blog.id },
      as("drafter")
    );

    expect(draftsOnly.status).toBe(200);
    expect(withLivePost.status).toBe(403);
    expect(withLivePost.body.errors[0].data?.blocked?.[0]).toMatchObject({
      item: folderRef(history.id),
      message: "Moving this item changes a live URL: you need publish rights",
    });
    expect(withLivePages.status).toBe(403);
    expect((await readStructure(payload, "folders", team.id)).folder).toBe(tree.blog.id);
    expect((await readStructure(payload, "folders", history.id)).folder).toBe(tree.about.id);
    expect((await readStructure(payload, "folders", tree.about.id)).folder).toBeNull();
  });

  it("access.move false refuses", async () => {
    const { payload } = harness;
    const tree = await seed();
    const request = { items: [pageRef(tree.pages.members.id)], toFolder: tree.blog.id };
    moveGate = () => false;

    const refused = await post<ErrorBody>("/folders-tree/move", request, as("editor"));
    const refusedPreview = await post<MovePreview>(
      "/folders-tree/move/preview",
      request,
      as("editor")
    );
    moveGate = () => true;
    const allowed = await post<MoveResult>("/folders-tree/move", request, as("editor"));

    expect(refused.status).toBe(403);
    expect(refused.body.errors[0].data?.blocked).toEqual([
      {
        item: pageRef(tree.pages.members.id),
        message: "You are not allowed to move this item here",
        reason: "forbidden",
      },
    ]);
    expect(refusedPreview.body).toMatchObject({ ok: false });
    expect(allowed.status).toBe(200);
    expect((await readStructure(payload, "pages", tree.pages.members.id)).folder).toBe(
      tree.blog.id
    );
  });

  it("asks access.move with the moved items and the target, after update access passed", async () => {
    const tree = await seed();
    const [team] = tree.subfolders;

    // The drafter is refused by update access first, so the gate is not asked.
    await post(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id },
      as("drafter")
    );
    expect(moveGateCalls).toEqual([]);

    await post(
      "/folders-tree/move",
      {
        items: [pageRef(tree.pages.contact.id), folderRef(team.id)],
        toFolder: tree.blog.id,
      },
      as("editor")
    );
    expect(moveGateCalls).toEqual([
      {
        items: [pageRef(tree.pages.contact.id), folderRef(team.id)],
        toFolder: tree.blog.id,
        user: userEmail("editor"),
      },
    ]);
  });

  it("the limited role cannot move into a folder outside its subtree", async () => {
    const { payload } = harness;
    const tree = await seed();
    await tieLimitedUserTo(tree.about.id);
    const [team, history] = tree.subfolders;
    const before = await readStructure(payload, "pages", tree.pages.contact.id);

    const outOfSubtree = await post<ErrorBody>(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id },
      as("editorLimited")
    );
    const toTopLevel = await post<ErrorBody>(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.contact.id)], toFolder: null },
      as("editorLimited")
    );
    const folderOut = await post<ErrorBody>(
      "/folders-tree/move",
      { items: [folderRef(history.id)], toFolder: tree.blog.id },
      as("editorLimited")
    );
    const fromOutside = await post<ErrorBody>(
      "/folders-tree/move",
      { items: [pageRef(tree.blogPost.id)], toFolder: team.id },
      as("editorLimited")
    );

    for (const refused of [outOfSubtree, toTopLevel, folderOut, fromOutside]) {
      expect(refused.status).toBe(403);
      expect(refused.body.errors[0].data?.reason).toBe("forbidden");
    }
    expect(await readStructure(payload, "pages", tree.pages.contact.id)).toEqual(before);
    expect((await readStructure(payload, "folders", history.id)).folder).toBe(tree.about.id);
  });

  it("the limited role can move inside its subtree", async () => {
    const { payload } = harness;
    const tree = await seed();
    await tieLimitedUserTo(tree.about.id);
    const [team, history] = tree.subfolders;

    const page = await post<MoveResult>(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.contact.id)], toFolder: team.id },
      as("editorLimited")
    );
    const folder = await post<MoveResult>(
      "/folders-tree/move",
      { items: [folderRef(history.id)], toFolder: team.id },
      as("editorLimited")
    );
    // A draft, so the drafter-only publish rule does not come into it.
    const reorder = await post<MoveResult>(
      "/folders-tree/move",
      { items: [pageRef(tree.pages.members.id)], position: "end", toFolder: team.id },
      as("editorLimited")
    );

    expect(page.status).toBe(200);
    expect(folder.status).toBe(200);
    expect(reorder.status).toBe(200);
    expect((await readStructure(payload, "pages", tree.pages.contact.id)).folder).toBe(team.id);
    expect((await readStructure(payload, "folders", history.id)).folder).toBe(team.id);
  });

  it("the move preview reports forbidden as a block instead of failing", async () => {
    const tree = await seed();
    const request = { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id };

    const drafter = await post<MovePreview>("/folders-tree/move/preview", request, as("drafter"));
    const editor = await post<MovePreview>("/folders-tree/move/preview", request, as("editor"));

    expect(drafter.status).toBe(200);
    expect(drafter.body.ok).toBe(false);
    expect(drafter.body.blocked).toMatchObject([
      { item: pageRef(tree.pages.contact.id), reason: "forbidden" },
    ]);
    expect(editor.body.ok).toBe(true);
  });
});

describe("folder preview access", () => {
  it("reports forbidden to a user who may not change the folder, and not to one who may", async () => {
    const tree = await seed();
    await tieLimitedUserTo(tree.about.id);
    const [team] = tree.subfolders;

    const outside = await post<MovePreview>(
      `/folders-tree/folders/${tree.blog.id}/preview`,
      { slug: "journal" },
      as("editorLimited")
    );
    const inside = await post<MovePreview>(
      `/folders-tree/folders/${team.id}/preview`,
      { slug: "crew" },
      as("editorLimited")
    );
    const movedOutside = await post<MovePreview>(
      `/folders-tree/folders/${team.id}/preview`,
      { parent: tree.blog.id },
      as("editorLimited")
    );

    expect(outside.body.ok).toBe(false);
    expect(outside.body.blocked).toEqual([
      {
        item: folderRef(tree.blog.id),
        message: "You are not allowed to change this folder",
        reason: "forbidden",
      },
    ]);
    expect(inside.body.ok).toBe(true);
    expect(movedOutside.body.blocked).toMatchObject([
      { item: folderRef(team.id), reason: "forbidden" },
    ]);
  });
});

describe("overrideAccess of moveItems", () => {
  it("checks access by default, as Payload 4's Local API does, and skips it with true", async () => {
    const { payload } = harness;
    const tree = await seed();
    const drafter = { ...(await readUser("drafter")), collection: "users" } as never;
    const request = { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id };

    const asDrafter = await moveItems(payload, { ...request, user: drafter }).catch(
      (error: unknown) => error
    );
    const explicit = await moveItems(payload, {
      ...request,
      overrideAccess: false,
      user: drafter,
    }).catch((error: unknown) => error);
    expect(asDrafter).toBeInstanceOf(MoveBlockedError);
    expect(explicit).toBeInstanceOf(MoveBlockedError);
    expect(moveGateCalls).toEqual([]);

    const system = await moveItems(payload, { ...request, overrideAccess: true });
    expect(system.moved).toEqual([pageRef(tree.pages.contact.id)]);
    // A system call skips access.move as well.
    expect(moveGateCalls).toEqual([]);
    expect((await readStructure(payload, "pages", tree.pages.contact.id)).folder).toBe(
      tree.blog.id
    );
  });

  it("takes the user from a request the caller passes", async () => {
    const { payload } = harness;
    const tree = await seed();
    const editorRequest = await createRequestFor("editor");
    const drafterRequest = await createRequestFor("drafter");
    const request = { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id };

    const refused = await moveItems(payload, { ...request, req: drafterRequest }).catch(
      (error: unknown) => error
    );
    const allowed = await moveItems(payload, { ...request, req: editorRequest });

    expect(refused).toMatchObject({ data: { reason: "forbidden" }, status: 403 });
    expect(allowed.moved).toEqual([pageRef(tree.pages.contact.id)]);
  });

  it("gives a host's access.move a copy of the request, so its changes do not stick", async () => {
    const { payload } = harness;
    const tree = await seed();
    const request = await createRequestFor("editor");
    request.context = { ...request.context, keep: true };
    const localeBefore = request.locale;
    const originalGate = getResolvedOptions(payload).access.move;
    getResolvedOptions(payload).access.move = ({ req }) => {
      req.context.pollution = true;
      req.locale = "de";

      return true;
    };
    try {
      await moveItems(payload, {
        items: [pageRef(tree.pages.members.id)],
        req: request,
        toFolder: tree.blog.id,
      });
    } finally {
      getResolvedOptions(payload).access.move = originalGate;
    }

    expect(request.context).toEqual({ keep: true });
    expect(request.locale).toBe(localeBefore);
  });
});

describe("what the update access is asked", () => {
  it("is asked with the new folder and order key, and with _status published for a live URL", async () => {
    const { payload } = harness;
    const tree = await seed();
    const asked: Array<{ data: Record<string, unknown> | undefined; id: number | undefined }> = [];
    const pagesAccess = payload.collections.pages.config.access;
    const original = pagesAccess.update;
    pagesAccess.update = (args) => {
      asked.push({ data: args.data, id: args.id as number | undefined });

      return true;
    };
    let result: MoveResult;
    try {
      result = await moveItems(payload, {
        items: [pageRef(tree.pages.contact.id), pageRef(tree.pages.members.id)],
        overrideAccess: false,
        toFolder: tree.blog.id,
        user: { ...(await readUser("editor")), collection: "users" } as never,
      });
    } finally {
      pagesAccess.update = original;
    }

    const orderKeyOf = (id: number) => result.orderKeys[`pages:${id}`];
    // The first pass asks with the folder only, the late pass adds the order key, and the live
    // page asks the publish question once more.
    expect(asked).toHaveLength(5);
    expect(asked).toContainEqual({ data: { folder: tree.blog.id }, id: tree.pages.contact.id });
    expect(asked).toContainEqual({ data: { folder: tree.blog.id }, id: tree.pages.members.id });
    expect(asked).toContainEqual({
      data: { folder: tree.blog.id, orderKey: orderKeyOf(tree.pages.contact.id) },
      id: tree.pages.contact.id,
    });
    expect(asked).toContainEqual({
      data: { folder: tree.blog.id, orderKey: orderKeyOf(tree.pages.members.id) },
      id: tree.pages.members.id,
    });
    // Only the published page asks the publish question.
    expect(asked).toContainEqual({
      data: {
        _status: "published",
        folder: tree.blog.id,
        orderKey: orderKeyOf(tree.pages.contact.id),
      },
      id: tree.pages.contact.id,
    });
  });

  it("asks the publish question once per collection and folder beneath a moved folder", async () => {
    const { payload } = harness;
    const tree = await seed();
    const asked: Array<Record<string, unknown> | undefined> = [];
    const pagesAccess = payload.collections.pages.config.access;
    const original = pagesAccess.update;
    pagesAccess.update = (args) => {
      asked.push({ ...args.data, id: args.id });

      return true;
    };
    try {
      await moveItems(payload, {
        items: [folderRef(tree.about.id)],
        overrideAccess: false,
        toFolder: tree.blog.id,
        user: { ...(await readUser("editor")), collection: "users" } as never,
      });
    } finally {
      pagesAccess.update = original;
    }

    // The two live pages of about are one group. Their order key stays their own, so none is sent;
    // the draft in team asks nothing.
    expect(asked).toHaveLength(1);
    expect(asked[0]).toMatchObject({ _status: "published", folder: tree.about.id });
    expect(asked[0]).not.toHaveProperty("orderKey");
  });
});

describe("tree item access and repair", () => {
  it("reports update, delete and publish of a tree item", async () => {
    const tree = await seed();
    const drafter = await createRequestFor("drafter");
    const editor = await createRequestFor("editor");

    expect(await getItemAccess({ item: pageRef(tree.pages.contact.id), req: drafter })).toEqual({
      delete: true,
      publish: false,
      update: true,
    });
    expect(await getItemAccess({ item: pageRef(tree.pages.contact.id), req: editor })).toEqual({
      delete: true,
      publish: true,
      update: true,
    });
  });

  it("reports a refused delete", async () => {
    const tree = await seed();
    const editor = await createRequestFor("editor");
    const pagesAccess = harness.payload.collections.pages.config.access;
    const original = pagesAccess.delete;
    pagesAccess.delete = () => false;
    try {
      expect(await getItemAccess({ item: pageRef(tree.pages.contact.id), req: editor })).toEqual({
        delete: false,
        publish: true,
        update: true,
      });
    } finally {
      pagesAccess.delete = original;
    }
  });

  it("reads the Where result of update access for a tree item", async () => {
    const tree = await seed();
    await tieLimitedUserTo(tree.about.id);
    const limited = await createRequestFor("editorLimited");

    const inside = await getItemAccess({ item: pageRef(tree.pages.contact.id), req: limited });
    const outside = await getItemAccess({ item: pageRef(tree.blogPost.id), req: limited });

    expect(inside.update).toBe(true);
    expect(outside.update).toBe(false);
  });

  it("lets only the admin repair in the dev app, and applies the spec's rule without access.repair", async () => {
    await seed();
    const options = getResolvedOptions(harness.payload);
    const editor = await createRequestFor("editor");
    const adminRequest = await createRequestFor("admin");

    expect(await canRepairTree({ options, req: adminRequest })).toBe(true);
    expect(await canRepairTree({ options, req: editor })).toBe(false);

    const withoutRepairOption = { ...options, access: { move: undefined, repair: undefined } };
    expect(await canRepairTree({ options: withoutRepairOption, req: editor })).toBe(true);
    expect(
      await canRepairTree({
        options: { ...withoutRepairOption, access: { move: () => false, repair: undefined } },
        req: editor,
      })
    ).toBe(false);
    const anonymous = await createPayloadRequest({ payload: harness.payload, req: {} });
    expect(await canRepairTree({ options: withoutRepairOption, req: anonymous })).toBe(false);
  });
});
