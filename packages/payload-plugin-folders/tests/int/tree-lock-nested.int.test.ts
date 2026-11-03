import type { CollectionConfig } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  isTreeLockHeld,
  setTreeLockTimeoutMs,
  treeLockTimeoutMs,
} from "../../src/core/treeLock.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createPage } from "../helpers/treeFixtures.js";

/**
 * The README's "Known limits": a host hook that calls the Local API without `req` inside a tree
 * write opens its own transaction and waits for a lock its caller holds, and the caller waits for
 * it. Nothing links the two calls, so the plugin cannot tell this from an ordinary second writer
 * and cannot fail it faster; what it can do is fail with a message that names the cause.
 */

type NestedMode = "copy" | "none" | "without-req";

let mode: NestedMode = "none";

const notesCollection: CollectionConfig = {
  slug: "notes",
  fields: [
    { name: "title", type: "text" },
    { name: "slug", type: "text" },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === "create" && mode !== "none") {
          await req.payload.create({
            collection: "pages",
            data: { slug: `nested-${mode}`, title: "Created by a hook" },
            depth: 0,
            overrideAccess: true,
            // A shallow copy, so the nested call cannot change the caller's context or locale.
            ...(mode === "copy" ? { req: { ...req } } : {}),
          });
        }

        return data;
      },
    ],
  },
  versions: true,
};

let harness: TestPayload;
const shortTimeoutMs = 300;
let previousTimeoutMs = treeLockTimeoutMs;

beforeAll(async () => {
  harness = await getTestPayload({
    extraCollections: [notesCollection],
    foldersOptions: {
      collections: { notes: true, pages: true, posts: { label: "Blog post" } } as never,
    },
  });
  previousTimeoutMs = setTreeLockTimeoutMs(shortTimeoutMs);
});

afterAll(async () => {
  setTreeLockTimeoutMs(previousTimeoutMs);
  await harness?.destroy();
});

afterEach(async () => {
  mode = "none";
  await clearTree(harness.payload);
  await harness.payload.db.deleteMany({
    collection: "notes" as never,
    where: { id: { exists: true } },
  });
});

const countCollection = async (collection: "notes" | "pages"): Promise<number> =>
  (
    await harness.payload.count({
      collection: collection as never,
      overrideAccess: true,
    })
  ).totalDocs;

describe("a nested Local API call inside a tree write", () => {
  it("without req fails with an error that names the cause, rolls back, and frees the lock", async () => {
    const { payload } = harness;
    mode = "without-req";

    const error = await payload
      .create({
        collection: "notes" as never,
        data: { slug: "outer", title: "Outer" } as never,
        depth: 0,
        overrideAccess: true,
      })
      .then(
        () => null,
        (caught: unknown) => caught as Error
      );

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toContain(
      `Timed out after ${shortTimeoutMs} ms waiting for the folder tree lock`
    );
    expect(error?.message).toContain("pass the hook's req to every nested payload call");
    expect(await countCollection("notes")).toBe(0);
    expect(await countCollection("pages")).toBe(0);
    expect(isTreeLockHeld(payload)).toBe(false);

    // The next write is not stuck behind the failed one.
    mode = "none";
    const page = await createPage(payload, { slug: "after-failure" });
    expect(page.id).toBeDefined();
  });

  it("with the caller's req copied joins the transaction and both writes commit", async () => {
    const { payload } = harness;
    mode = "copy";

    await payload.create({
      collection: "notes" as never,
      data: { slug: "outer-copy", title: "Outer" } as never,
      depth: 0,
      overrideAccess: true,
    });

    expect(await countCollection("notes")).toBe(1);
    expect(await countCollection("pages")).toBe(1);
    expect(isTreeLockHeld(payload)).toBe(false);
  });
});
