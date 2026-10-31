import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { rootDraftPendingMessage } from "../../src/core/rootFlip.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

type FieldError = { message: string; path: string };

const fieldErrorsOf = (error: unknown): FieldError[] =>
  ((error as { data?: { errors?: FieldError[] } }).data?.errors ?? []) as FieldError[];

const catchError = async (work: Promise<unknown>): Promise<unknown> => {
  try {
    await work;
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
};

const publishedPage = (payload: Payload, folder: number, slug: string) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, isFolderRoot: false, slug, title: slug } as never,
    depth: 0,
    overrideAccess: true,
  });

/** A page that is published, and then edited into a newer draft nobody has published. */
const pageWithNewerDraft = async (payload: Payload, folder: number, slug: string) => {
  const page = await publishedPage(payload, folder, slug);
  await payload.update({
    collection: "pages",
    data: { _status: "draft", title: `${slug} unreviewed edit` } as never,
    depth: 0,
    draft: true,
    id: page.id,
    overrideAccess: true,
  });

  return page;
};

const readLive = (payload: Payload, id: number) =>
  payload.findByID({ collection: "pages", depth: 0, id, overrideAccess: true });

const readLatest = (payload: Payload, id: number) =>
  payload.findByID({ collection: "pages", depth: 0, draft: true, id, overrideAccess: true });

describe("a live save that flips the root flag on while a newer draft exists", () => {
  it("is refused with the draft-pending message, and nothing is written", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await pageWithNewerDraft(payload, folder.id, "intro");

    const error = await catchError(
      payload.update({
        collection: "pages",
        data: { _status: "published", isFolderRoot: true } as never,
        depth: 0,
        id: page.id,
        overrideAccess: true,
      })
    );

    expect((error as { status: number }).status).toBe(400);
    expect(fieldErrorsOf(error)).toEqual([
      { message: rootDraftPendingMessage, path: "isFolderRoot" },
    ]);
    // The live row kept its title and flag, and the unreviewed draft is still only a draft.
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: false, title: "intro" });
    expect(await readLatest(payload, page.id)).toMatchObject({
      _status: "draft",
      isFolderRoot: false,
      title: "intro unreviewed edit",
    });
  });

  it("never publishes a draft saved at the same moment, whichever save the lock runs first", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");

    // The editor's Set as root read the page as published, and an autosave lands in the same round trip.
    const [draftSave, liveSave] = await Promise.allSettled([
      payload.update({
        collection: "pages",
        data: { _status: "draft", title: "intro unreviewed edit" } as never,
        depth: 0,
        draft: true,
        id: page.id,
        overrideAccess: true,
      }),
      payload.update({
        collection: "pages",
        data: { _status: "published", isFolderRoot: true } as never,
        depth: 0,
        id: page.id,
        overrideAccess: true,
      }),
    ]);

    expect(draftSave.status).toBe("fulfilled");
    const live = await readLive(payload, page.id);
    // Either the live save ran first (root, old title) or it was refused (not root, old title): the
    // unreviewed title is never live.
    expect(live.title).toBe("intro");
    if (liveSave.status === "rejected") {
      expect(fieldErrorsOf(liveSave.reason)).toEqual([
        { message: rootDraftPendingMessage, path: "isFolderRoot" },
      ]);
      expect(live.isFolderRoot).toBe(false);
    } else {
      expect(live.isFolderRoot).toBe(true);
    }
  });

  it("goes through when no newer draft exists", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");

    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: true } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: true });
  });

  it("goes through as a draft save, named by its status or by the draft flag alone", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await pageWithNewerDraft(payload, folder.id, "intro");

    await payload.update({
      collection: "pages",
      data: { _status: "draft", isFolderRoot: true } as never,
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });
    expect(await readLatest(payload, page.id)).toMatchObject({
      _status: "draft",
      isFolderRoot: true,
    });
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: false });

    // The same through the flag alone, which is how a REST client with `?draft=true` may write it.
    const other = await pageWithNewerDraft(payload, folder.id, "second");
    await payload.update({
      collection: "pages",
      data: { isFolderRoot: true } as never,
      depth: 0,
      draft: true,
      id: other.id,
      overrideAccess: true,
    });
    expect(await readLatest(payload, other.id)).toMatchObject({ isFolderRoot: true });
  });

  it("is no flip when the draft already carries the flag, so a form publishes as it stands", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await pageWithNewerDraft(payload, folder.id, "intro");
    await payload.update({
      collection: "pages",
      data: { _status: "draft", isFolderRoot: true } as never,
      depth: 0,
      draft: true,
      id: page.id,
      overrideAccess: true,
    });

    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: true } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });

    expect(await readLive(payload, page.id)).toMatchObject({
      isFolderRoot: true,
      title: "intro unreviewed edit",
    });
  });

  it("does not apply to a collection without drafts", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const post = await payload.create({
      collection: "posts",
      data: { folder: folder.id, slug: "intro", title: "intro" } as never,
      depth: 0,
      overrideAccess: true,
    });

    await payload.update({
      collection: "posts",
      data: { isFolderRoot: true } as never,
      depth: 0,
      id: post.id,
      overrideAccess: true,
    });

    expect(
      await payload.findByID({ collection: "posts", depth: 0, id: post.id, overrideAccess: true })
    ).toMatchObject({ isFolderRoot: true });
  });

  it("is refused through Payload's REST route as well, with the message the admin reads", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await pageWithNewerDraft(payload, folder.id, "intro");

    const refused = await callEndpoint<{
      errors: Array<{ data?: { errors?: FieldError[] } }>;
    }>({
      body: { _status: "published", isFolderRoot: true },
      config: harness.config,
      method: "PATCH",
      path: `/pages/${page.id}?depth=0`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(refused.status).toBe(400);
    expect(refused.body.errors[0]?.data?.errors).toEqual([
      { message: rootDraftPendingMessage, path: "isFolderRoot" },
    ]);

    // Saved as a draft instead, the same request goes through and the live page is untouched.
    const asDraft = await callEndpoint({
      body: { _status: "draft", isFolderRoot: true },
      config: harness.config,
      method: "PATCH",
      path: `/pages/${page.id}?depth=0&draft=true`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(asDraft.status).toBe(200);
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: false });
  });
});
