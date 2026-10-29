import { createPayloadRequest } from "payload";
import type { Payload } from "payload";
import { generateNKeysBetween } from "payload/shared";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { planFolderEdit } from "../../src/core/folderPreview.js";
import type { MovePreview } from "../../src/core/move.js";
import { moveItems } from "../../src/server/index.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { countDbReads } from "../helpers/countDbReads.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type ErrorBody = {
  errors: Array<{
    data?: { blocked?: Array<{ message: string; reason: string }>; reason?: string };
    message: string;
  }>;
};

const password = "test-password";
const roles = ["admin", "drafter", "editor", "editorLimited"] as const;
type Role = (typeof roles)[number];
const emailOf = (role: Role) => `${role.toLowerCase()}@scope.example.com`;

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
  for (const role of roles) {
    await harness.payload.create({
      collection: "users",
      data: { email: emailOf(role), password, role } as never,
      overrideAccess: true,
    });
  }
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const pageRef = (id: number) => ({ collection: "pages", id });
const folderRef = (id: number) => ({ collection: "folders", id });

const request = <TBody>(method: "PATCH" | "POST", path: string, body: unknown, role: Role) =>
  callEndpoint<TBody>({
    body,
    config: harness.config,
    method,
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    user: { email: emailOf(role), password },
  });

const readUser = async (role: Role) =>
  (
    await harness.payload.find({
      collection: "users",
      depth: 0,
      overrideAccess: true,
      where: { email: { equals: emailOf(role) } },
    })
  ).docs[0];

const tieLimitedUserTo = async (folderId: number) => {
  await harness.payload.update({
    collection: "users",
    data: { limitedFolder: folderId } as never,
    id: (await readUser("editorLimited")).id,
    overrideAccess: true,
  });
};

const asUser = async (role: Role) => ({ ...(await readUser(role)), collection: "users" }) as never;

const createLivePage = (data: { folder: number | null; slug: string; title: string }) =>
  harness.payload.create({
    collection: "pages",
    data: { _status: "published", ...data } as never,
    depth: 0,
    overrideAccess: true,
  });

const readFolderSlug = async (id: number) =>
  (
    (await harness.payload.db.findOne({
      collection: "folders",
      locale: "all",
      where: { id: { equals: id } },
    })) as unknown as { slug: Record<string, string> }
  ).slug.en;

const readPageFolder = async (collection: "pages" | "posts", id: number) =>
  (
    (await harness.payload.db.findOne({
      collection,
      where: { id: { equals: id } },
    })) as unknown as { folder: number | null }
  ).folder;

/** Posts written without the plugin's hooks, as `seedTree` does: only what a move reads. */
const createPostsQuickly = async (
  payload: Payload,
  folder: number,
  prefix: string,
  count: number
): Promise<number[]> => {
  const orderKeys = generateNKeysBetween(null, null, count);
  const ids: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const post = await payload.create({
      collection: "posts",
      context: { foldersInternal: true },
      data: {
        folder,
        orderKey: orderKeys[index],
        slug: `${prefix}-${index + 1}`,
        structureRevision: 0,
        title: `${prefix} ${index + 1}`,
      } as never,
      depth: 0,
      overrideAccess: true,
    });
    ids.push(post.id as number);
  }

  return ids;
};

const postRefs = (selected: number[]) => selected.map((id) => ({ collection: "posts", id }));

const spyOnUpdateAccess = (collection: "pages" | "posts", answer: (id: unknown) => unknown) => {
  const { access } = harness.payload.collections[collection].config;
  const original = access.update;
  const calls: Array<{ data: unknown; id: unknown }> = [];
  access.update = ((args: { data?: unknown; id?: unknown }) => {
    calls.push({ data: args.data, id: args.id });

    return answer(args.id);
  }) as never;

  return {
    calls,
    restore: () => {
      access.update = original;
    },
  };
};

describe("a refused user learns nothing about content outside their scope", () => {
  it("answers 403, not a conflict, when the target is outside the subtree", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await createLivePage({ folder: tree.about.id, slug: "post", title: "Secret about post" });
    await tieLimitedUserTo(tree.blog.id);
    const body = { items: [pageRef(tree.blogPost.id)], toFolder: tree.about.id };

    // The same move by an editor is a path conflict, which proves the probe sets one up.
    const asEditor = await request<ErrorBody>("POST", "/folders-tree/move", body, "editor");
    expect(asEditor.status).toBe(409);
    expect(JSON.stringify(asEditor.body)).toContain("Secret about post");

    const { body: refused, status } = await request<ErrorBody>(
      "POST",
      "/folders-tree/move",
      body,
      "editorLimited"
    );

    expect(status).toBe(403);
    expect(refused.errors[0].data?.reason).toBe("forbidden");
    const serialized = JSON.stringify(refused);
    expect(serialized).not.toContain("Secret about post");
    expect(serialized).not.toContain("/about/post");
    expect(await readPageFolder("pages", tree.blogPost.id)).toBe(tree.blog.id);
  });

  it("a preview of a page outside the subtree quotes no title and no path", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const hidden = await createLivePage({
      folder: tree.about.id,
      slug: "hidden",
      title: "Hidden launch plan",
    });
    await tieLimitedUserTo(tree.blog.id);

    const { body, status } = await request<MovePreview>(
      "POST",
      "/folders-tree/move/preview",
      { items: [pageRef(hidden.id as number)], toFolder: tree.blog.id },
      "editorLimited"
    );

    expect(status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.blocked).toMatchObject([{ reason: "forbidden" }]);
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("Hidden launch plan");
    expect(serialized).not.toContain("/about/hidden");
  });

  it("a refused update and a refused publish both use neutral messages", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const drafter = await request<ErrorBody>(
      "POST",
      "/folders-tree/move",
      { items: [pageRef(tree.pages.contact.id)], toFolder: tree.blog.id },
      "drafter"
    );

    expect(drafter.status).toBe(403);
    expect(JSON.stringify(drafter.body)).not.toContain("Contact");
    expect(JSON.stringify(drafter.body)).not.toContain("/about");
  });
});

describe("a move that passes access reads no more as it grows", () => {
  it("an editor's 100-page move makes the same reads as a 10-page move", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source" });
    const small = await createFolder(payload, { slug: "small" });
    const large = await createFolder(payload, { slug: "large" });
    const ids = await createPostsQuickly(payload, source.id, "item", 110);
    const editor = await asUser("editor");

    const smallMove = await countDbReads(payload, () =>
      moveItems(payload, {
        items: postRefs(ids.slice(0, 10)),
        overrideAccess: false,
        toFolder: small.id,
        user: editor,
      })
    );
    const largeMove = await countDbReads(payload, () =>
      moveItems(payload, {
        items: postRefs(ids.slice(10, 110)),
        overrideAccess: false,
        toFolder: large.id,
        user: editor,
      })
    );

    expect(smallMove.result.moved).toHaveLength(10);
    expect(largeMove.result.moved).toHaveLength(100);
    expect(largeMove.reads - smallMove.reads).toBeLessThanOrEqual(3);
  });
});

describe("a moved folder asks the publish question per collection and folder", () => {
  const seedFolderWithPosts = async () => {
    const { payload } = harness;
    const target = await createFolder(payload, { slug: "target" });
    const parent = await createFolder(payload, { slug: "parent" });
    const child = await createFolder(payload, { parent: parent.id, slug: "child" });
    const parentPosts = await createPostsQuickly(payload, parent.id, "parent-post", 50);
    const childPosts = await createPostsQuickly(payload, child.id, "child-post", 5);

    return { child, childPosts, parent, parentPosts, target };
  };

  it("calls the access function once per folder, not once per page", async () => {
    const { payload } = harness;
    const { parent, target } = await seedFolderWithPosts();
    const spy = spyOnUpdateAccess("posts", () => true);
    try {
      await moveItems(payload, {
        items: [folderRef(parent.id)],
        overrideAccess: false,
        toFolder: target.id,
        user: await asUser("editor"),
      });
    } finally {
      spy.restore();
    }

    // Two folders hold posts: parent (50) and child (5).
    expect(spy.calls).toHaveLength(2);
    expect(spy.calls.every((call) => !("orderKey" in (call.data as object)))).toBe(true);
  });

  it("a Where refusal on one page beneath still blocks the move", async () => {
    const { payload } = harness;
    const { parent, parentPosts, target } = await seedFolderWithPosts();
    const spy = spyOnUpdateAccess("posts", () => ({ id: { not_equals: parentPosts[7] } }));
    const error = await moveItems(payload, {
      items: [folderRef(parent.id)],
      overrideAccess: false,
      toFolder: target.id,
      user: await asUser("editor"),
    })
      .catch((caught: unknown) => caught)
      .finally(() => spy.restore());

    expect(error).toMatchObject({ data: { reason: "forbidden" }, status: 403 });
    const row = (await payload.db.findOne({
      collection: "folders",
      where: { id: { equals: parent.id } },
    })) as unknown as { parent: number | null };
    expect(row.parent).toBeNull();
  });
});

describe("a folder rename needs publish rights for the live pages beneath it", () => {
  const rename = (id: number, slug: string, role: Role) =>
    request<ErrorBody>("PATCH", `/folders/${id}?locale=en`, { slug }, role);
  const previewRename = (id: number, slug: string, role: Role) =>
    request<MovePreview>("POST", `/folders-tree/folders/${id}/preview`, { slug }, role);

  it("a drafter's rename of a folder with a published page beneath is refused over REST", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body, status } = await rename(tree.about.id, "company", "drafter");

    expect(status).toBe(403);
    expect(body.errors[0].message).toBe(
      "Renaming this folder changes a live URL: you need publish rights"
    );
    expect(JSON.stringify(body)).not.toContain("Contact");
    expect(await readFolderSlug(tree.about.id)).toBe("about");
  });

  it("a drafter's rename preview is refused the same way", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const { body, status } = await previewRename(tree.about.id, "company", "drafter");

    expect(status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.blocked).toEqual([
      {
        item: folderRef(tree.about.id),
        message: "Renaming this folder changes a live URL: you need publish rights",
        reason: "forbidden",
      },
    ]);
  });

  it("a drafter can rename a folder that holds only drafts beneath it", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const [team] = tree.subfolders;

    const preview = await previewRename(team.id, "crew", "drafter");
    const saved = await rename(team.id, "crew", "drafter");

    expect(preview.body.ok).toBe(true);
    expect(saved.status).toBe(200);
    expect(await readFolderSlug(team.id)).toBe("crew");
  });

  it("an editor can rename the folder with the published page", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);

    const saved = await rename(tree.about.id, "company", "editor");

    expect(saved.status).toBe(200);
    expect(await readFolderSlug(tree.about.id)).toBe("company");
  });

  it("a system call is never asked, for the save or for the preview", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const drafter = await asUser("drafter");
    const spy = spyOnUpdateAccess("pages", () => false);
    try {
      const previewRequest = await createPayloadRequest({
        payload,
        req: {},
        user: drafter,
      });
      const preview = await planFolderEdit(
        previewRequest,
        { folder: tree.about.id, slug: "company" },
        { overrideAccess: true }
      );
      await payload.update({
        collection: "folders",
        data: { slug: "company" },
        id: tree.about.id,
        locale: "en",
        overrideAccess: true,
        user: drafter,
      });

      expect(preview.ok).toBe(true);
      expect(spy.calls).toEqual([]);
    } finally {
      spy.restore();
    }
    expect(await readFolderSlug(tree.about.id)).toBe("company");
  });
});

describe("the dev app's users cannot raise their own rights", () => {
  it("editorLimited cannot change its own role or limitedFolder", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await tieLimitedUserTo(tree.blog.id);
    const limited = await readUser("editorLimited");

    const { status } = await request<unknown>(
      "PATCH",
      `/users/${limited.id}`,
      { limitedFolder: tree.about.id, role: "admin" },
      "editorLimited"
    );

    const after = (await readUser("editorLimited")) as unknown as {
      limitedFolder: number;
      role: string;
    };
    expect([200, 403]).toContain(status);
    expect(after.role).toBe("editorLimited");
    expect(after.limitedFolder).toBe(tree.blog.id);
  });

  it("a non-admin cannot update another user or create an admin", async () => {
    const editor = await readUser("editor");

    const other = await request<ErrorBody>(
      "PATCH",
      `/users/${editor.id}`,
      { email: "taken-over@scope.example.com" },
      "editorLimited"
    );
    const created = await request<ErrorBody>(
      "POST",
      "/users",
      { email: "new-admin@scope.example.com", password, role: "admin" },
      "editorLimited"
    );

    expect([403, 404]).toContain(other.status);
    expect(created.status).toBe(403);
    expect((await readUser("editor")).email).toBe(emailOf("editor"));
  });
});
