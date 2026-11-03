import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder } from "../helpers/treeFixtures.js";

// A host `afterChange` hook that saves the same page again on the same request, which is how
// hooks that sync a title or a search index commonly behave.
let resaves = 0;
let isResaving = false;
const resavingArticles: CollectionConfig = {
  slug: "resaving-articles",
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        // A closure flag, not req.context: a nested call merges its context into the shared req.
        if (isResaving) {
          return doc;
        }
        isResaving = true;
        resaves += 1;
        try {
          await req.payload.update({
            collection: "resaving-articles" as never,
            data: { title: doc.title } as never,
            depth: 0,
            draft: true,
            id: doc.id,
            locale: "en",
            overrideAccess: true,
            req,
          });
        } finally {
          isResaving = false;
        }

        return doc;
      },
    ],
  },
  versions: { drafts: true },
};

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({
    extraCollections: [resavingArticles],
    foldersOptions: {
      collections: { "resaving-articles": true, pages: true, posts: true } as never,
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

type FieldError = { locale?: string; message: string; path: string };

const catchError = async (work: Promise<unknown>): Promise<Record<string, unknown>> => {
  try {
    await work;
  } catch (error) {
    return error as Record<string, unknown>;
  }
  throw new Error("expected the call to fail");
};

describe("the after-write check with a host hook that saves the page again", () => {
  it("publishing every locale over a de draft clash is refused although the host re-saves the page", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Host resave" });
    const create = (slug: string, title: string) =>
      payload.create({
        collection: "resaving-articles" as never,
        data: { _status: "published", folder: folder.id, slug, title } as never,
        depth: 0,
        overrideAccess: true,
      }) as unknown as Promise<{ id: number }>;
    const owner = await create("owner-resave", "Owner");
    await payload.update({
      collection: "resaving-articles" as never,
      data: { _status: "published", slug: "wire", title: "Draht" } as never,
      id: owner.id,
      locale: "de",
      overrideAccess: true,
    });
    const other = await create("other-resave", "Other");
    await payload.update({
      collection: "resaving-articles" as never,
      data: { slug: "wire", title: "Anderer Draht" } as never,
      draft: true,
      id: other.id,
      locale: "de",
      overrideAccess: true,
    });
    const resavesBefore = resaves;

    const error = await catchError(
      payload.update({
        collection: "resaving-articles" as never,
        data: { _status: "published" } as never,
        depth: 0,
        id: other.id,
        overrideAccess: true,
        publishAllLocales: true,
      })
    );

    // The host hook did run its nested save, so the guard had to keep the outer snapshot.
    expect(resaves).toBeGreaterThan(resavesBefore);
    expect(error.status).toBe(400);
    const errors = (error as { data?: { errors?: FieldError[] } }).data?.errors ?? [];
    expect(errors.map(({ message, path }) => ({ message, path }))).toEqual([
      { message: `${folder.fullPath}/wire is already used by Draht (published)`, path: "slug" },
    ]);
    const stored = (await payload.findByID({
      collection: "resaving-articles" as never,
      depth: 0,
      draft: false,
      id: other.id,
      locale: "all",
      overrideAccess: true,
    })) as unknown as { pathSegment: Record<string, string | null> };
    expect(stored.pathSegment.de ?? null).toBeNull();
  });
});
