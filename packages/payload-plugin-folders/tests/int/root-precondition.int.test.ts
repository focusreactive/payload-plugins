import { handleEndpoints } from "payload";
import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { fetchVersionMarker, preconditionQueryOf } from "../../src/admin/api.js";
import type { FoldersApiContext } from "../../src/admin/api.js";
import {
  pageChangedLiveMessage,
  pageChangedMessage,
  rootPreconditionParameter,
} from "../../src/core/rootPrecondition.js";
import { callEndpoint, testUser } from "../helpers/callEndpoint.js";
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

/**
 * A request that carries the precondition the way Payload's REST route hands it to the hooks. The
 * admin sends it as a query parameter; a Local API call names it on the request.
 */
const withMarker = (marker: string) =>
  ({ query: { [rootPreconditionParameter]: marker } }) as never;

/** The admin's own marker read, answered by Payload's REST router on the test instance. */
const adminContext = async (): Promise<FoldersApiContext> => {
  // callEndpoint creates the shared test user on its first call; the login below needs it.
  await callEndpoint({
    config: harness.config,
    path: "/users/me",
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });
  const { token } = await harness.payload.login({ collection: "users", data: testUser });

  return {
    baseUrl: "http://localhost:4078/api",
    fetchImplementation: (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `JWT ${token}`);

      return handleEndpoints({
        config: harness.config,
        payloadInstanceCacheKey: harness.cacheKey,
        request: new Request(input as string, { ...init, headers }),
      });
    },
  };
};

const readMarker = async (collection: "pages" | "posts", id: number): Promise<string> => {
  const marker = await fetchVersionMarker(await adminContext(), {
    collection,
    hasDrafts: collection === "pages",
    id,
  });
  if (marker === undefined) {
    throw new Error("the page has no updatedAt");
  }

  return marker;
};

const publishedPage = (payload: Payload, folder: number, slug: string, isFolderRoot = false) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, isFolderRoot, slug, title: slug } as never,
    depth: 0,
    overrideAccess: true,
  });

const saveDraft = (payload: Payload, id: number, data: Record<string, unknown>, locale?: string) =>
  payload.update({
    collection: "pages",
    data: { _status: "draft", ...data } as never,
    depth: 0,
    draft: true,
    id,
    ...(locale === undefined ? {} : { locale: locale as never }),
    overrideAccess: true,
  });

const readLive = (payload: Payload, id: number) =>
  payload.findByID({ collection: "pages", depth: 0, id, overrideAccess: true });

const readLatest = (payload: Payload, id: number) =>
  payload.findByID({ collection: "pages", depth: 0, draft: true, id, overrideAccess: true });

/** A pause so two saves never share a millisecond, which is all the marker can tell apart. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 15));

describe("a save without the precondition", () => {
  it("is not checked: the edit view's full publish of a never-published page with root ticked passes", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    // Created as a draft and never published, the state an autosaved new page is in.
    const page = await payload.create({
      collection: "pages",
      data: { _status: "draft", folder: folder.id, slug: "intro", title: "intro" } as never,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });
    await saveDraft(payload, page.id, { isFolderRoot: true });

    // The form publishes what it holds, with the flag ticked in the form and in the draft alike.
    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: true, title: "intro edited" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
    });
    expect(await readLive(payload, page.id)).toMatchObject({
      _status: "published",
      isFolderRoot: true,
      title: "intro edited",
    });

    // Ticking and publishing in one go, over a draft that did not carry the flag, passes too.
    const otherFolder = await createFolder(harness.payload, { slug: "guides" });
    const other = await payload.create({
      collection: "pages",
      data: { _status: "draft", folder: otherFolder.id, slug: "other", title: "other" } as never,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });
    await saveDraft(payload, other.id, { title: "other draft" });
    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: true } as never,
      depth: 0,
      id: other.id,
      overrideAccess: true,
    });
    expect(await readLive(payload, other.id)).toMatchObject({
      isFolderRoot: true,
      title: "other draft",
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
});

describe("a live save that carries a stale precondition", () => {
  it("is refused when it turns the root flag on, and nothing is written", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");
    const marker = await readMarker("pages", page.id);
    await tick();
    await saveDraft(payload, page.id, { title: "intro unreviewed edit" });

    const error = await catchError(
      payload.update({
        collection: "pages",
        data: { _status: "published", isFolderRoot: true } as never,
        depth: 0,
        id: page.id,
        overrideAccess: true,
        req: withMarker(marker),
      })
    );

    expect((error as { status: number }).status).toBe(400);
    expect(fieldErrorsOf(error)).toEqual([{ message: pageChangedMessage, path: "isFolderRoot" }]);
    // The live row kept its title and flag, and the unreviewed draft is still only a draft.
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: false, title: "intro" });
    expect(await readLatest(payload, page.id)).toMatchObject({
      _status: "draft",
      isFolderRoot: false,
      title: "intro unreviewed edit",
    });
  });

  it("is refused when it turns the root flag off, and the page stays the root page", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro", true);
    const marker = await readMarker("pages", page.id);
    await tick();
    await saveDraft(payload, page.id, { title: "intro unreviewed edit" });

    const error = await catchError(
      payload.update({
        collection: "pages",
        data: { _status: "published", isFolderRoot: false, slug: "intro" } as never,
        depth: 0,
        id: page.id,
        overrideAccess: true,
        req: withMarker(marker),
      })
    );

    expect(fieldErrorsOf(error)).toEqual([{ message: pageChangedMessage, path: "isFolderRoot" }]);
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: true, title: "intro" });
  });

  it("is refused when the draft that landed was saved in another locale than the one the marker came from", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");
    const marker = await readMarker("pages", page.id);
    await tick();
    await saveDraft(payload, page.id, { title: "Einleitung, ungeprueft" }, "de");

    const error = await catchError(
      payload.update({
        collection: "pages",
        data: { _status: "published", isFolderRoot: true } as never,
        depth: 0,
        id: page.id,
        overrideAccess: true,
        req: withMarker(marker),
      })
    );

    expect(fieldErrorsOf(error)).toEqual([{ message: pageChangedMessage, path: "isFolderRoot" }]);
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: false });
  });

  it("is refused for a collection without drafts, with the message that has no draft to offer", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const post = await payload.create({
      collection: "posts",
      data: { folder: folder.id, slug: "intro", title: "intro" } as never,
      depth: 0,
      overrideAccess: true,
    });
    const marker = await readMarker("posts", post.id);
    await tick();
    await payload.update({
      collection: "posts",
      data: { title: "intro edited elsewhere" } as never,
      depth: 0,
      id: post.id,
      overrideAccess: true,
    });

    const error = await catchError(
      payload.update({
        collection: "posts",
        data: { isFolderRoot: true } as never,
        depth: 0,
        id: post.id,
        overrideAccess: true,
        req: withMarker(marker),
      })
    );
    expect(fieldErrorsOf(error)).toEqual([
      { message: pageChangedLiveMessage, path: "isFolderRoot" },
    ]);

    // Read again, the same save goes through.
    await payload.update({
      collection: "posts",
      data: { isFolderRoot: true } as never,
      depth: 0,
      id: post.id,
      overrideAccess: true,
      req: withMarker(await readMarker("posts", post.id)),
    });
    expect(
      await payload.findByID({ collection: "posts", depth: 0, id: post.id, overrideAccess: true })
    ).toMatchObject({ isFolderRoot: true });
  });

  it("is refused when the marker is not a date", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");

    const error = await catchError(
      payload.update({
        collection: "pages",
        data: { _status: "published", isFolderRoot: true } as never,
        depth: 0,
        id: page.id,
        overrideAccess: true,
        req: withMarker("not-a-date"),
      })
    );

    expect(fieldErrorsOf(error)).toEqual([{ message: pageChangedMessage, path: "isFolderRoot" }]);
  });
});

describe("a live save that carries a fresh precondition", () => {
  it("turns the root flag on and off", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");

    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: true } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
      req: withMarker(await readMarker("pages", page.id)),
    });
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: true });

    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: false, slug: "intro" } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
      req: withMarker(await readMarker("pages", page.id)),
    });
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: false });
  });

  it("passes over a draft the editor already saw, and publishes it as the form shows it", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");
    await saveDraft(payload, page.id, { title: "intro seen edit" });

    // The marker is read after the draft, so the editor has seen it.
    await payload.update({
      collection: "pages",
      data: { _status: "published", isFolderRoot: true } as never,
      depth: 0,
      id: page.id,
      overrideAccess: true,
      req: withMarker(await readMarker("pages", page.id)),
    });
    expect(await readLive(payload, page.id)).toMatchObject({
      isFolderRoot: true,
      title: "intro seen edit",
    });
  });

  it("passes as a draft save after the page changed, because that save publishes nothing it does not carry", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");

    // Save as draft instead: the admin sends no precondition with it.
    await saveDraft(payload, page.id, { isFolderRoot: true });

    expect(await readLatest(payload, page.id)).toMatchObject({
      _status: "draft",
      isFolderRoot: true,
    });
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: false });
  });
});

describe("a draft save that lands at the same moment as a live save with the precondition", () => {
  it("never publishes the draft, whichever save the lock runs first", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");
    // The editor's Set as root read the page, and an autosave lands in the same round trip.
    const marker = await readMarker("pages", page.id);
    await tick();

    const [draftSave, liveSave] = await Promise.allSettled([
      saveDraft(payload, page.id, { title: "intro unreviewed edit" }),
      payload.update({
        collection: "pages",
        data: { _status: "published", isFolderRoot: true } as never,
        depth: 0,
        id: page.id,
        overrideAccess: true,
        req: withMarker(marker),
      }),
    ]);

    expect(draftSave.status).toBe("fulfilled");
    const live = await readLive(payload, page.id);
    // Either the live save ran first (root, old title) or it was refused (not root, old title): the
    // unreviewed title is never live.
    expect(live.title).toBe("intro");
    if (liveSave.status === "rejected") {
      expect(fieldErrorsOf(liveSave.reason)).toEqual([
        { message: pageChangedMessage, path: "isFolderRoot" },
      ]);
      expect(live.isFolderRoot).toBe(false);
    } else {
      expect(live.isFolderRoot).toBe(true);
    }
  });
});

describe("through Payload's REST route", () => {
  it("refuses a stale precondition with the message the admin reads, and Save as draft still goes through", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");
    const marker = await readMarker("pages", page.id);
    await tick();
    await saveDraft(payload, page.id, { title: "intro unreviewed edit" });

    const refused = await callEndpoint<{
      errors: Array<{ data?: { errors?: FieldError[] } }>;
    }>({
      body: { _status: "published", isFolderRoot: true },
      config: harness.config,
      method: "PATCH",
      path: `/pages/${page.id}?depth=0&${new URLSearchParams(preconditionQueryOf(marker)).toString()}`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(refused.status).toBe(400);
    expect(refused.body.errors[0]?.data?.errors).toEqual([
      { message: pageChangedMessage, path: "isFolderRoot" },
    ]);

    // Saved as a draft instead, with no precondition, the same change goes through and the live page
    // is untouched.
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

  it("accepts the marker the admin reads, in both directions", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "docs" });
    const page = await publishedPage(payload, folder.id, "intro");

    const turnedOn = await callEndpoint({
      body: { _status: "published", isFolderRoot: true },
      config: harness.config,
      method: "PATCH",
      path: `/pages/${page.id}?depth=0&${new URLSearchParams(
        preconditionQueryOf(await readMarker("pages", page.id))
      ).toString()}`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(turnedOn.status).toBe(200);
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: true });

    const turnedOff = await callEndpoint({
      body: { _status: "published", isFolderRoot: false, slug: "intro" },
      config: harness.config,
      method: "PATCH",
      path: `/pages/${page.id}?depth=0&${new URLSearchParams(
        preconditionQueryOf(await readMarker("pages", page.id))
      ).toString()}`,
      payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(turnedOff.status).toBe(200);
    expect(await readLive(payload, page.id)).toMatchObject({ isFolderRoot: false });
  });
});
