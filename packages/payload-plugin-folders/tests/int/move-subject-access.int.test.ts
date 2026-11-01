import type { Access } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { MovePreview } from "../../src/core/move.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";

type ErrorBody = { errors: Array<{ data?: { reason?: string }; message: string }> };

const password = "test-password";
const editor = { email: "subject-editor@example.com", password };

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
  await harness.payload.create({
    collection: "users",
    data: { email: editor.email, password, role: "editor" } as never,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

/** The editor cannot read posts whose slug is `secret`; everyone else reads everything. */
const hideSecretPostsFromEditor: Access = ({ req }) =>
  req.user?.email === editor.email ? { slug: { not_equals: "secret" } } : true;

const withPostsRead = async (read: Access, work: () => Promise<void>): Promise<void> => {
  const { config } = harness.payload.collections.posts;
  const original = config.access.read;
  config.access.read = read;
  try {
    await work();
  } finally {
    config.access.read = original;
  }
};

const post = <TBody>(path: string, body: unknown, user?: { email: string; password: string }) =>
  callEndpoint<TBody>({
    body,
    config: harness.config,
    method: "POST",
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    ...(user ? { user } : {}),
  });

/** The refusals without the item they name, which differs between a hidden and a missing id. */
const withoutItem = (preview: MovePreview) =>
  preview.blocked.map(({ message, reason }) => ({ message, reason }));

describe("moving an item the user cannot read", () => {
  it("answers as it does for an item that does not exist and leaks no path", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const [, history] = tree.subfolders;
    const secret = await payload.create({
      collection: "posts",
      data: { folder: history.id, slug: "secret", title: "Secret" },
      depth: 0,
      overrideAccess: true,
    });

    // The admin may read the post and sees where it lives: the control for what must not leak.
    const asAdmin = await post<MovePreview>("/folders-tree/move/preview", {
      items: [{ collection: "posts", id: secret.id }],
      toFolder: tree.blog.id,
    });
    expect(asAdmin.body.ok).toBe(true);
    expect(asAdmin.body.samples[0].from).toBe("/about/history/secret");

    await withPostsRead(hideSecretPostsFromEditor, async () => {
      const hidden = await post<MovePreview>(
        "/folders-tree/move/preview",
        { items: [{ collection: "posts", id: secret.id }], toFolder: tree.blog.id },
        editor
      );
      const missing = await post<MovePreview>(
        "/folders-tree/move/preview",
        { items: [{ collection: "posts", id: 999_999 }], toFolder: tree.blog.id },
        editor
      );
      const refusedMove = await post<ErrorBody>(
        "/folders-tree/move",
        { items: [{ collection: "posts", id: secret.id }], toFolder: tree.blog.id },
        editor
      );

      expect(hidden.body.ok).toBe(false);
      expect(hidden.body.samples).toEqual([]);
      expect(withoutItem(hidden.body)).toEqual(withoutItem(missing.body));
      expect(hidden.body.blocked[0].reason).toBe("stale");
      expect(refusedMove.status).toBe(409);
    });

    const stored = await payload.findByID({
      collection: "posts",
      depth: 0,
      id: secret.id,
      overrideAccess: true,
    });
    expect(stored.folder).toBe(history.id);
  });

  it("still moves what the user can read", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const [, history] = tree.subfolders;
    const visible = await payload.create({
      collection: "posts",
      data: { folder: history.id, slug: "visible", title: "Visible" },
      depth: 0,
      overrideAccess: true,
    });

    await withPostsRead(hideSecretPostsFromEditor, async () => {
      const moved = await post<{ moved: unknown[] }>(
        "/folders-tree/move",
        { items: [{ collection: "posts", id: visible.id }], toFolder: tree.blog.id },
        editor
      );

      expect(moved.status).toBe(200);
    });
  });
});
