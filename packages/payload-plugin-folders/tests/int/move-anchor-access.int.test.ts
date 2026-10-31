import type { Access } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { MovePreview } from "../../src/core/move.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";

type ErrorBody = { errors: Array<{ data?: { reason?: string }; message: string }> };

const password = "test-password";
const editor = { email: "anchor-editor@example.com", password };

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

/** Posts the editor cannot read: all of them, or only those whose slug is `secret`. */
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

const readAs = (user: { email: string; password: string }): Access => {
  const hidden: Access = ({ req }) =>
    req.user?.email === user.email ? { slug: { not_equals: "secret" } } : true;

  return hidden;
};

const preview = (body: unknown) =>
  callEndpoint<MovePreview>({
    body,
    config: harness.config,
    method: "POST",
    path: "/folders-tree/move/preview",
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    user: editor,
  });

const previewAsAdmin = (body: unknown) =>
  callEndpoint<MovePreview>({
    body,
    config: harness.config,
    method: "POST",
    path: "/folders-tree/move/preview",
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

const move = (body: unknown) =>
  callEndpoint<ErrorBody>({
    body,
    config: harness.config,
    method: "POST",
    path: "/folders-tree/move",
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    user: editor,
  });

describe("a move after an anchor the user cannot read", () => {
  it("answers as it does for an anchor that does not exist", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const [, history] = tree.subfolders;
    const secret = await payload.create({
      collection: "posts",
      data: { folder: history.id, slug: "secret", title: "Secret" },
      depth: 0,
      overrideAccess: true,
    });
    const visible = await payload.create({
      collection: "posts",
      data: { folder: history.id, slug: "visible", title: "Visible" },
      depth: 0,
      overrideAccess: true,
    });
    const moving = [{ collection: "pages", id: tree.pages.contact.id }];

    // The admin may read the anchor and learns its folder: the control for what must not leak.
    const asAdmin = await previewAsAdmin({
      after: { collection: "posts", id: secret.id },
      items: moving,
    });
    expect(asAdmin.body.targetFolderId).toBe(history.id);

    await withPostsRead(readAs(editor), async () => {
      const readable = await preview({
        after: { collection: "posts", id: visible.id },
        items: moving,
      });
      const hidden = await preview({
        after: { collection: "posts", id: secret.id, expected: { parentId: history.id } },
        items: moving,
      });
      const hiddenWrongFolder = await preview({
        after: { collection: "posts", id: secret.id, expected: { parentId: tree.blog.id } },
        items: moving,
      });
      const missing = await preview({
        after: { collection: "posts", id: 999_999, expected: { parentId: history.id } },
        items: moving,
      });
      const refusedMove = await move({
        after: { collection: "posts", id: secret.id, expected: { parentId: history.id } },
        items: moving,
      });

      expect(readable.body.targetFolderId).toBe(history.id);
      expect(hidden.body.ok).toBe(false);
      expect(hidden.body.targetFolderId).toBeNull();
      // Neither the folder nor the stale test on `expected` tells a hidden anchor from a missing one.
      expect(hidden.body.blocked).toEqual(missing.body.blocked);
      expect(hiddenWrongFolder.body.blocked).toEqual(missing.body.blocked);
      expect(hidden.body.blocked[0].reason).toBe("stale");
      expect(refusedMove.status).toBe(409);
    });
  });

  it("answers the same when the editor cannot read the whole collection", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    const moving = [{ collection: "pages", id: tree.pages.contact.id }];

    await withPostsRead(
      ({ req }) => req.user?.email !== editor.email,
      async () => {
        const hidden = await preview({
          after: { collection: "posts", id: tree.pages.timeline.id },
          items: moving,
        });
        const missing = await preview({
          after: { collection: "posts", id: 999_999 },
          items: moving,
        });

        expect(hidden.body.targetFolderId).toBeNull();
        expect(hidden.body.blocked).toEqual(missing.body.blocked);
      }
    );
  });
});
