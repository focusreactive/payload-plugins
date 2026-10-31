import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { resolvePath } from "../../src/core/resolve.js";
import type { OperationProgress } from "../../src/core/operations.js";
import type { PublishPreview, PublishSkip } from "../../src/core/publish.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type PublishBody = {
  errors?: Array<{ data?: { reason?: string; refused?: unknown[] }; message: string }>;
  operationId?: number;
  skipped?: PublishSkip[];
  total?: number;
  updated?: number;
};

const password = "test-password";
const drafter = { email: "publish-drafter@example.com", password };
const editor = { email: "publish-editor@example.com", password };

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
  for (const [user, role] of [
    [drafter, "drafter"],
    [editor, "editor"],
  ] as const) {
    await harness.payload.create({
      collection: "users",
      data: { email: user.email, password, role } as never,
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

const folderRef = (id: number) => ({ collection: "folders", id });

const createDraftPage = (payload: Payload, folder: number | null, slug: string, title = slug) =>
  payload.create({
    collection: "pages",
    data: { _status: "draft", folder, slug, title } as never,
    depth: 0,
    draft: true,
    overrideAccess: true,
  });

const createLivePage = (payload: Payload, folder: number | null, slug: string, title = slug) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug, title } as never,
    depth: 0,
    overrideAccess: true,
  });

const readStatus = async (payload: Payload, id: number): Promise<string | undefined> => {
  const row = (await payload.db.findOne({
    collection: "pages",
    locale: "all",
    where: { id: { equals: id } },
  })) as unknown as { _status?: Record<string, string> | string };

  return typeof row._status === "object" ? row._status.en : row._status;
};

describe("POST /folders-tree/publish", () => {
  it("publishing a folder publishes the latest drafts of nested pages", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const deep = await createFolder(payload, { parent: docs.id, slug: "deep" });
    const draftOnly = await createDraftPage(payload, docs.id, "draft-only", "Draft only");
    const unchanged = await createLivePage(payload, docs.id, "unchanged", "Unchanged");
    const changed = await createLivePage(payload, deep.id, "changed", "Changed v1");
    await payload.update({
      collection: "pages",
      data: { title: "Changed v2" },
      depth: 0,
      draft: true,
      id: changed.id,
      overrideAccess: true,
    });
    // Before the publish the public still sees v1.
    const before = await resolvePath(payload, { overrideAccess: true, path: "/docs/deep/changed" });
    expect(before).toMatchObject({ doc: { title: "Changed v1" }, type: "page" });
    expect(await resolvePath(payload, { overrideAccess: true, path: "/docs/draft-only" })).toEqual({
      type: "notFound",
    });

    const { body, status } = await post<PublishBody>("/folders-tree/publish", {
      action: "publish",
      items: [folderRef(docs.id)],
    });

    expect(status).toBe(200);
    expect(body.updated).toBe(2);
    expect(body.skipped).toEqual([{ collection: "pages", count: 1, reason: "unchanged" }]);
    expect(await readStatus(payload, draftOnly.id)).toBe("published");
    expect(
      await resolvePath(payload, { overrideAccess: true, path: "/docs/deep/changed" })
    ).toMatchObject({
      doc: { title: "Changed v2" },
      type: "page",
    });
    expect(
      await resolvePath(payload, { overrideAccess: true, path: "/docs/draft-only" })
    ).toMatchObject({
      type: "page",
    });
    expect(await readStatus(payload, unchanged.id)).toBe("published");

    // A repeat is a no-op.
    const repeated = await post<PublishBody>("/folders-tree/publish", {
      action: "publish",
      items: [folderRef(docs.id)],
    });
    expect(repeated.body.updated).toBe(0);
    expect(repeated.body.skipped).toEqual([{ collection: "pages", count: 3, reason: "unchanged" }]);
  });

  it("posts without drafts are reported as live", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await createDraftPage(payload, docs.id, "draft-page");
    await payload.create({
      collection: "posts",
      data: { folder: docs.id, slug: "first-post", title: "First post" },
      depth: 0,
      overrideAccess: true,
    });
    await payload.create({
      collection: "posts",
      data: { folder: docs.id, slug: "second-post", title: "Second post" },
      depth: 0,
      overrideAccess: true,
    });

    const { body } = await post<PublishBody>("/folders-tree/publish", {
      action: "publish",
      items: [folderRef(docs.id)],
    });
    const unpublish = await post<PublishBody>("/folders-tree/publish", {
      action: "unpublish",
      items: [folderRef(docs.id)],
    });

    expect(body.updated).toBe(1);
    expect(body.skipped).toEqual([{ collection: "posts", count: 2, reason: "live" }]);
    // Posts cannot be unpublished either: they stay live.
    expect(unpublish.body.skipped).toContainEqual({
      collection: "posts",
      count: 2,
      reason: "live",
    });
    expect(
      await resolvePath(payload, { overrideAccess: true, path: "/docs/first-post" })
    ).toMatchObject({
      type: "page",
    });
  });

  it("unpublish hides pages from the resolver", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const guide = await createLivePage(payload, docs.id, "guide", "Guide");
    const alreadyDraft = await createDraftPage(payload, docs.id, "later", "Later");
    expect(await resolvePath(payload, { overrideAccess: true, path: "/docs/guide" })).toMatchObject(
      { type: "page" }
    );

    const { body, status } = await post<PublishBody>("/folders-tree/publish", {
      action: "unpublish",
      items: [folderRef(docs.id)],
    });

    expect(status).toBe(200);
    expect(body.updated).toBe(1);
    expect(body.skipped).toEqual([{ collection: "pages", count: 1, reason: "unchanged" }]);
    expect(await readStatus(payload, guide.id)).toBe("draft");
    expect(await readStatus(payload, alreadyDraft.id)).toBe("draft");
    expect(await resolvePath(payload, { overrideAccess: true, path: "/docs/guide" })).toEqual({
      type: "notFound",
    });
  });

  it("a drafter cannot publish", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const first = await createDraftPage(payload, docs.id, "first");
    const second = await createDraftPage(payload, docs.id, "second");

    const refused = await post<PublishBody>(
      "/folders-tree/publish",
      { action: "publish", items: [folderRef(docs.id)] },
      drafter
    );

    expect(refused.status).toBe(403);
    expect(refused.body.errors?.[0].data?.reason).toBe("forbidden");
    expect(refused.body.errors?.[0].data?.refused).toHaveLength(2);
    // A refusal names no title or path.
    expect(JSON.stringify(refused.body)).not.toMatch(/first|second/u);
    expect(await readStatus(payload, first.id)).toBe("draft");
    expect(await readStatus(payload, second.id)).toBe("draft");

    const allowed = await post<PublishBody>(
      "/folders-tree/publish",
      { action: "publish", items: [folderRef(docs.id)] },
      editor
    );
    expect(allowed.status).toBe(200);
    expect(allowed.body.updated).toBe(2);
    expect(await readStatus(payload, first.id)).toBe("published");
  });

  it("counts what a publish would do without writing", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    await createFolder(payload, { parent: docs.id, slug: "deep" });
    const page = await createDraftPage(payload, docs.id, "preview-me");

    const { body, status } = await post<PublishPreview>(
      "/folders-tree/publish",
      { action: "publish", dryRun: true, items: [folderRef(docs.id)] },
      drafter
    );

    expect(status).toBe(200);
    expect(body).toEqual({ folders: 2, isBatched: false, pages: 1, skipped: [] });
    expect(await readStatus(payload, page.id)).toBe("draft");
  });

  it("a 300-page publish runs as an operation", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    for (let index = 1; index <= 300; index += 1) {
      await payload.create({
        collection: "pages",
        context: { foldersInternal: true },
        data: {
          _status: "draft",
          folder: docs.id,
          orderKey: `a${String(index).padStart(4, "0")}`,
          slug: `bulk-${index}`,
          structureRevision: 0,
          title: `Bulk ${index}`,
        } as never,
        depth: 0,
        draft: true,
        overrideAccess: true,
      });
    }

    const started = await post<PublishBody>("/folders-tree/publish", {
      action: "publish",
      items: [folderRef(docs.id)],
    });

    expect(started.status).toBe(200);
    expect(started.body.total).toBe(300);
    expect(started.body.updated).toBeUndefined();
    const operationId = started.body.operationId as number;
    const published = async () =>
      (
        await payload.count({
          collection: "pages",
          overrideAccess: true,
          where: { _status: { equals: "published" } },
        })
      ).totalDocs;
    expect(await published()).toBe(0);

    const first = await post<OperationProgress>(`/folders-tree/operations/${operationId}/step`, {});
    expect(first.body).toEqual({ done: 200, status: "running", total: 300 });
    expect(await published()).toBe(200);

    const second = await post<OperationProgress>(
      `/folders-tree/operations/${operationId}/step`,
      {}
    );
    expect(second.body).toEqual({ done: 300, status: "done", total: 300 });
    expect(await published()).toBe(300);
  });
});
