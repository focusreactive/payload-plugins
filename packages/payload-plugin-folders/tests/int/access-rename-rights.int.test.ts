import type { CollectionConfig } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { MovePreview } from "../../src/core/move.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type ErrorBody = {
  errors: Array<{ data?: { reason?: string }; message: string }>;
};

const password = "test-password";
const roles = ["drafter", "editor"] as const;
type Role = (typeof roles)[number];
const emailOf = (role: Role) => `${role}@rename-rights.example.com`;

/**
 * A page collection without drafts, so every row counts as published. Its `update` access decides
 * per document when it is given an id and answers with a `Where` when it is not, the way a host
 * would write it for bulk updates. A lock on one page must refuse a folder move or rename whichever
 * page the database happens to return first.
 */
const articles: CollectionConfig = {
  slug: "articles",
  access: {
    update: async ({ id, req }) => {
      if (id === undefined) {
        return { locked: { not_equals: true } };
      }
      const article = (await req.payload.findByID({
        collection: "articles" as never,
        depth: 0,
        id,
        overrideAccess: true,
        req,
      })) as unknown as { locked?: boolean };

      return !article.locked;
    },
  },
  fields: [
    { name: "title", type: "text" },
    { name: "slug", type: "text" },
    { name: "locked", type: "checkbox", defaultValue: false },
  ],
};

let harness: TestPayload;
// Scenario 2 turns the host hook on; scenario 1 needs it off, because a read after the access
// function would put the flag back before the save is checked.
let readsFoldersInHook = false;

beforeAll(async () => {
  harness = await getTestPayload({
    extraCollections: [articles],
    foldersOptions: {
      collections: { articles: true, pages: true, posts: { label: "Blog post" } } as never,
      folders: {
        access: {
          // A host function that reads the folder with the request it was given, overriding access.
          update: async ({ id, req }) => {
            if (!req.user) {
              return false;
            }
            if (id !== undefined) {
              await req.payload.findByID({
                collection: "folders",
                depth: 0,
                id,
                overrideAccess: true,
                req,
              });
            }

            return true;
          },
        },
        // A host hook that reads folders with the request it was given, checking access.
        overrides: (collection) => ({
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeValidate: [
              ...(collection.hooks?.beforeValidate ?? []),
              async ({ data, req }) => {
                if (readsFoldersInHook) {
                  await req.payload.find({ collection: "folders", depth: 0, limit: 1, req });
                }

                return data;
              },
            ],
          },
        }),
      },
    },
  });
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
  await harness.payload.db.deleteMany({
    collection: "articles" as never,
    where: { id: { exists: true } },
  });
});

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

const readFolderSlug = async (id: number) =>
  (
    (await harness.payload.db.findOne({
      collection: "folders",
      locale: "all",
      where: { id: { equals: id } },
    })) as unknown as { slug: Record<string, string> }
  ).slug.en;

const createLivePage = (folder: number, slug: string) =>
  harness.payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug, title: slug } as never,
    depth: 0,
    overrideAccess: true,
  });

const createArticle = (folder: number, slug: string, locked: boolean) =>
  harness.payload.create({
    collection: "articles" as never,
    data: { folder, locked, slug, title: slug } as never,
    depth: 0,
    overrideAccess: true,
  });

const renameBody = { slug: "renamed" };

describe("the rename check follows its own operation's overrideAccess", () => {
  it("a nested read with overrideAccess in the update access does not let a drafter rename a live folder", async () => {
    const { payload } = harness;
    const about = await createFolder(payload, { slug: "about" });
    await createLivePage(about.id, "contact");

    const rest = await request<ErrorBody>(
      "PATCH",
      `/folders/${about.id}?locale=en`,
      renameBody,
      "drafter"
    );
    const local = await payload
      .update({
        collection: "folders",
        data: renameBody,
        id: about.id,
        locale: "en",
        user: {
          ...(
            await payload.find({
              collection: "users",
              depth: 0,
              overrideAccess: true,
              where: { email: { equals: emailOf("drafter") } },
            })
          ).docs[0],
          collection: "users",
        } as never,
      })
      .catch((error: unknown) => error);

    expect(rest.status).toBe(403);
    expect(rest.body.errors[0].message).toBe(
      "Renaming this folder changes a live URL: you need publish rights"
    );
    expect(local).toMatchObject({ status: 403 });
    expect(await readFolderSlug(about.id)).toBe("about");
  });

  it("a nested read that checks access in a hook does not stop a system rename", async () => {
    const { payload } = harness;
    const about = await createFolder(payload, { slug: "about" });
    await createLivePage(about.id, "contact");
    readsFoldersInHook = true;

    try {
      await payload.update({
        collection: "folders",
        data: renameBody,
        id: about.id,
        locale: "en",
        overrideAccess: true,
      });
    } finally {
      readsFoldersInHook = false;
    }

    expect(await readFolderSlug(about.id)).toBe("renamed");
  });
});

describe("a folder move or rename never depends on which page the database returns first", () => {
  const holdsLockedAndOpen = async (order: "locked first" | "open first") => {
    const { payload } = harness;
    const holder = await createFolder(payload, { slug: "holder" });
    const target = await createFolder(payload, { slug: "target" });
    if (order === "locked first") {
      await createArticle(holder.id, "locked", true);
      await createArticle(holder.id, "open", false);
    } else {
      await createArticle(holder.id, "open", false);
      await createArticle(holder.id, "locked", true);
    }

    return { holder, target };
  };

  it("refuses the move and the rename when the locked page was created first", async () => {
    const { holder, target } = await holdsLockedAndOpen("locked first");

    const move = await request<ErrorBody>(
      "POST",
      "/folders-tree/move",
      { items: [{ collection: "folders", id: holder.id }], toFolder: target.id },
      "editor"
    );
    const rename = await request<ErrorBody>(
      "PATCH",
      `/folders/${holder.id}?locale=en`,
      renameBody,
      "editor"
    );
    const preview = await request<MovePreview>(
      "POST",
      `/folders-tree/folders/${holder.id}/preview`,
      renameBody,
      "editor"
    );

    expect(move.status).toBe(403);
    expect(rename.status).toBe(403);
    expect(preview.body.blocked).toMatchObject([{ reason: "forbidden" }]);
    expect(await readFolderSlug(holder.id)).toBe("holder");
  });

  it("refuses the move and the rename when the open page was created first", async () => {
    const { holder, target } = await holdsLockedAndOpen("open first");

    const move = await request<ErrorBody>(
      "POST",
      "/folders-tree/move",
      { items: [{ collection: "folders", id: holder.id }], toFolder: target.id },
      "editor"
    );
    const rename = await request<ErrorBody>(
      "PATCH",
      `/folders/${holder.id}?locale=en`,
      renameBody,
      "editor"
    );
    const preview = await request<MovePreview>(
      "POST",
      `/folders-tree/folders/${holder.id}/preview`,
      renameBody,
      "editor"
    );

    expect(move.status).toBe(403);
    expect(rename.status).toBe(403);
    expect(preview.body.blocked).toMatchObject([{ reason: "forbidden" }]);
    expect(await readFolderSlug(holder.id)).toBe("holder");
  });

  it("allows a folder whose pages are all open", async () => {
    const { payload } = harness;
    const holder = await createFolder(payload, { slug: "clean" });
    const target = await createFolder(payload, { slug: "target" });
    await createArticle(holder.id, "one", false);
    await createArticle(holder.id, "two", false);

    const move = await request<unknown>(
      "POST",
      "/folders-tree/move",
      { items: [{ collection: "folders", id: holder.id }], toFolder: target.id },
      "editor"
    );
    const rename = await request<unknown>(
      "PATCH",
      `/folders/${holder.id}?locale=en`,
      renameBody,
      "editor"
    );

    expect(move.status).toBe(200);
    expect(rename.status).toBe(200);
    expect(await readFolderSlug(holder.id)).toBe("renamed");
  });
});
