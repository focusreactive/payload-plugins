import { describe, expect, it } from "vitest";

import { FoldersApiError } from "../../src/admin/api.js";
import type { MoveBody, MovePreview } from "../../src/admin/api.js";
import {
  buildMoveBody,
  buildUndoRequests,
  needsConfirmation,
  rootsOfSelection,
  runMove,
  snapshotBeforeMove,
  undoMove,
} from "../../src/admin/Move/moveFlow.js";
import { createTreeStore, itemKeyOf, rootKey } from "../../src/admin/store.js";
import type { TreeStore } from "../../src/admin/store.js";
import type { ItemRef, TreeItem } from "../../src/types.js";

const allowed = { delete: true, publish: true, update: true };

const folder = (id: number, title: string, parentId: number | null = null, ancestorIds = "/") =>
  ({
    access: allowed,
    ancestorIds,
    childCount: 0,
    collection: "folders",
    depth: 0,
    fullPath: `/${title.toLowerCase()}`,
    hasRootPage: false,
    id,
    kind: "folder",
    orderKey: `f${id}`,
    parentId,
    slug: title.toLowerCase(),
    slugIsFallback: false,
    structureRevision: 0,
    title,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }) satisfies TreeItem;

const page = (id: number, title: string, parentId: number | null, ancestorIds = "/") =>
  ({
    access: allowed,
    ancestorIds,
    collection: "pages",
    depth: 0,
    fullPath: `/${title.toLowerCase()}`,
    id,
    kind: "page",
    orderKey: `p${id}`,
    parentId,
    slug: title.toLowerCase(),
    slugIsFallback: false,
    status: "published",
    structureRevision: 0,
    title,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }) satisfies TreeItem;

const blogId = 10;
const newsId = 11;

const withCounts = (tree: Record<string, TreeItem[]>): Record<string, TreeItem[]> => {
  for (const rows of Object.values(tree)) {
    for (const [index, row] of rows.entries()) {
      if (row.kind === "folder") {
        rows[index] = { ...row, childCount: tree[String(row.id)]?.length ?? 0 };
      }
    }
  }

  return tree;
};

const freshTree = (): Record<string, TreeItem[]> =>
  withCounts({
    [blogId]: [
      page(1, "Alpha", blogId, `/${blogId}/`),
      page(2, "Beta", blogId, `/${blogId}/`),
      page(3, "Gamma", blogId, `/${blogId}/`),
      page(4, "Delta", blogId, `/${blogId}/`),
    ],
    [newsId]: [page(5, "Existing", newsId, `/${newsId}/`)],
    [rootKey]: [folder(blogId, "Blog"), folder(newsId, "News")],
  });

type FakeServer = {
  fetchImplementation: typeof fetch;
  /** What the next move request answers instead of moving: a status and a refusal reason. */
  refuseNext: { reason: string; status: number } | null;
  /** The bodies of every move request, in order. */
  moveBodies: MoveBody[];
  tree: Record<string, TreeItem[]>;
};

const json = (body: unknown, status = 200) => Promise.resolve(Response.json(body, { status }));

const refKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;

/** A small tree server: children reads, and moves that apply the body the way the real one does. */
const createServer = (): FakeServer => {
  let revision = 1;
  const server: FakeServer = {
    fetchImplementation: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.endsWith("/folders-tree/revision")) {
        return json({ revision });
      }
      if (url.pathname.endsWith("/folders-tree/move")) {
        const body = JSON.parse(String(init?.body)) as MoveBody;
        server.moveBodies.push(body);
        if (server.refuseNext) {
          const refusal = server.refuseNext;
          server.refuseNext = null;

          return json(
            { errors: [{ data: { reason: refusal.reason }, message: "Refused" }] },
            refusal.status
          );
        }
        const movedKeys = new Set(body.items.map(refKey));
        // `expected` is what the move checks first: a stale parent is a 409.
        for (const item of body.items) {
          const current = Object.values(server.tree)
            .flat()
            .find((row) => refKey(row) === refKey(item));
          if (
            !current ||
            (item.expected && String(item.expected.parentId) !== String(current.parentId))
          ) {
            return json(
              {
                errors: [
                  {
                    data: { reason: "stale" },
                    message: "This part of the tree changed. Reload and try again.",
                  },
                ],
              },
              409
            );
          }
        }
        const moving = body.items.map(
          (item) =>
            Object.values(server.tree)
              .flat()
              .find((row) => refKey(row) === refKey(item)) as TreeItem
        );
        for (const key of Object.keys(server.tree)) {
          server.tree[key] = (server.tree[key] ?? []).filter((row) => !movedKeys.has(refKey(row)));
        }
        const afterRow = body.after
          ? Object.values(server.tree)
              .flat()
              .find((row) => refKey(row) === refKey(body.after as ItemRef))
          : undefined;
        const targetKey = body.after
          ? String(afterRow?.parentId ?? rootKey)
          : String(body.toFolder ?? rootKey);
        const targetId = targetKey === rootKey ? null : Number(targetKey);
        const rows = server.tree[targetKey] ?? [];
        const moved = moving.map((row) => ({
          ...row,
          orderKey: `moved-${row.id}`,
          parentId: targetId,
        }));
        const index = body.after
          ? rows.findIndex((row) => refKey(row) === refKey(body.after as ItemRef)) + 1
          : body.position === "end"
            ? rows.length
            : 0;
        rows.splice(index, 0, ...moved);
        server.tree[targetKey] = rows;
        withCounts(server.tree);
        revision += 1;

        return json({
          changes: [],
          moved: body.items.map(({ collection, id }) => ({ collection, id })),
          orderKeys: Object.fromEntries(moved.map((row) => [refKey(row), row.orderKey])),
          revision,
          structureRevisions: {},
        });
      }
      const parent = url.searchParams.get("parent") ?? rootKey;
      const rows = server.tree[parent] ?? [];

      return json({ hasMore: false, items: rows, nextCursor: null, revision });
    }) as unknown as typeof fetch,
    moveBodies: [],
    refuseNext: null,
    tree: freshTree(),
  };

  return server;
};

const createStore = (server: FakeServer): TreeStore =>
  createTreeStore({
    baseUrl: "/api",
    fetchImplementation: server.fetchImplementation,
    locale: "en",
    pageSize: 100,
  });

const titlesIn = (store: TreeStore, folderKey: string): string[] =>
  (store.getState().childrenByFolder[folderKey]?.items ?? []).map((item) => item.title);

const loadBoth = async (store: TreeStore): Promise<void> => {
  await store.loadChildren(null);
  await store.setExpanded(blogId, true);
  await store.setExpanded(newsId, true);
};

const rowsOf = (store: TreeStore, folderKey: string, ...titles: string[]): TreeItem[] =>
  titles.map(
    (title) =>
      store
        .getState()
        .childrenByFolder[folderKey]?.items.find((item) => item.title === title) as TreeItem
  );

const previewOf = (overrides: Partial<MovePreview> = {}): MovePreview => ({
  blocked: [],
  droppedItems: [],
  foldersRewritten: 0,
  mirrorRowsToWrite: 0,
  ok: true,
  orderKeys: {},
  redirectRowsToWrite: 0,
  samples: [],
  targetFolderId: null,
  urlChanges: { draftOnly: 0, published: 0, publishedAcrossLocales: 0 },
  warnings: [],
  ...overrides,
});

describe("rootsOfSelection", () => {
  it("leaves out a row inside another selected folder, whether a direct child or deeper", () => {
    const parent = folder(10, "Blog");
    const child = folder(12, "2026", 10, "/10/");
    const nested = page(20, "Deep", 12, "/10/12/");
    const direct = page(21, "Direct", 10, "/10/");
    const outside = page(22, "Outside", null);

    const roots = rootsOfSelection([parent, child, nested, direct, outside]);

    expect(roots.map((item) => item.title)).toEqual(["Blog", "Outside"]);
  });

  it("keeps a page that shares an id with a selected folder", () => {
    const parent = folder(10, "Blog");
    const sameId = page(10, "Same id", null);

    expect(rootsOfSelection([parent, sameId]).map((item) => item.title)).toEqual([
      "Blog",
      "Same id",
    ]);
  });
});

describe("buildMoveBody", () => {
  it("carries what the editor saw for every item, in one body", () => {
    const body = buildMoveBody([page(1, "Alpha", blogId), page(2, "Beta", null)], {
      position: "end",
      toFolder: newsId,
    });

    expect(body).toEqual({
      items: [
        { collection: "pages", expected: { orderKey: "p1", parentId: blogId }, id: 1 },
        { collection: "pages", expected: { orderKey: "p2", parentId: null }, id: 2 },
      ],
      position: "end",
      toFolder: newsId,
    });
  });

  it("sends redirects false only when the editor unticked the box", () => {
    const target = { position: "start", toFolder: null } as const;

    expect(buildMoveBody([page(1, "Alpha", null)], target)).not.toHaveProperty("redirects");
    expect(buildMoveBody([page(1, "Alpha", null)], target, true)).not.toHaveProperty("redirects");
    expect(buildMoveBody([page(1, "Alpha", null)], target, false).redirects).toBe(false);
  });

  it("names the top level with null, not by leaving the target out", () => {
    const body = buildMoveBody([page(1, "Alpha", blogId)], { position: "start", toFolder: null });

    expect(body.toFolder).toBeNull();
  });
});

describe("needsConfirmation", () => {
  const publishedChange = previewOf({
    urlChanges: { draftOnly: 0, published: 3, publishedAcrossLocales: 6 },
  });
  const refused = previewOf({
    blocked: [{ item: { collection: "pages", id: 1 }, message: "No", reason: "forbidden" }],
    ok: false,
  });

  it("asks when a published URL changes, and never for a reorder, in the default mode", () => {
    expect(needsConfirmation("urlChange", publishedChange)).toBe(true);
    expect(needsConfirmation("urlChange", previewOf())).toBe(false);
    expect(
      needsConfirmation(
        "urlChange",
        previewOf({ urlChanges: { draftOnly: 4, published: 0, publishedAcrossLocales: 0 } })
      )
    ).toBe(false);
  });

  it("asks about a warning even when no URL changes", () => {
    const warned = previewOf({
      warnings: [{ item: { collection: "pages", id: 1 }, message: "Types", reason: "type" }],
    });

    expect(needsConfirmation("urlChange", warned)).toBe(true);
  });

  it("always asks in always mode and never asks in never mode", () => {
    expect(needsConfirmation("always", previewOf())).toBe(true);
    expect(needsConfirmation("never", publishedChange)).toBe(false);
  });

  it("opens for a refused move in every mode, so the reasons are shown", () => {
    expect(needsConfirmation("never", refused)).toBe(true);
    expect(needsConfirmation("urlChange", refused)).toBe(true);
    expect(needsConfirmation("always", refused)).toBe(true);
  });
});

describe("the Undo path", () => {
  it("records each row's folder and the sibling above it that does not move", async () => {
    const server = createServer();
    const store = createStore(server);
    await loadBoth(store);
    const [alpha, beta, delta] = rowsOf(store, String(blogId), "Alpha", "Beta", "Delta");

    const snapshots = snapshotBeforeMove(store.getState(), [
      alpha as TreeItem,
      beta as TreeItem,
      delta as TreeItem,
    ]);

    // Alpha was first; Beta follows Alpha, which moves too, so it counts back to the top;
    // Delta follows Gamma, which stays.
    expect(snapshots.map((snapshot) => snapshot.anchor)).toEqual([
      null,
      null,
      { collection: "pages", id: 3 },
    ]);
    expect(snapshots.every((snapshot) => snapshot.parentId === blogId)).toBe(true);
  });

  it("puts a contiguous selection back with one request, each item after its old sibling", async () => {
    const server = createServer();
    const store = createStore(server);
    await loadBoth(store);
    const [beta, gamma] = rowsOf(store, String(blogId), "Beta", "Gamma");

    const outcome = await runMove(
      { context: { baseUrl: "/api", fetchImplementation: server.fetchImplementation }, store },
      [beta as TreeItem, gamma as TreeItem],
      { position: "start", toFolder: newsId },
      true
    );
    expect(server.moveBodies).toHaveLength(1);
    expect(titlesIn(store, String(blogId))).toEqual(["Alpha", "Delta"]);
    expect(titlesIn(store, String(newsId))).toEqual(["Beta", "Gamma", "Existing"]);

    await undoMove(
      { context: { baseUrl: "/api", fetchImplementation: server.fetchImplementation }, store },
      outcome
    );

    // One request for the move and one for the undo, not one per item.
    expect(server.moveBodies).toHaveLength(2);
    const undoBody = server.moveBodies[1] as MoveBody;
    expect(undoBody.after).toEqual({ collection: "pages", id: 1 });
    expect(undoBody.redirects).toBe(false);
    expect(undoBody.items.map((item) => item.id)).toEqual([2, 3]);
    // The undo names what the move just gave each row, so a row moved again meanwhile is refused.
    expect(undoBody.items.map((item) => item.expected)).toEqual([
      { orderKey: "moved-2", parentId: newsId },
      { orderKey: "moved-3", parentId: newsId },
    ]);
    expect(titlesIn(store, String(blogId))).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
    expect(titlesIn(store, String(newsId))).toEqual(["Existing"]);
  });

  it("puts the first item of a folder back at the top of it", async () => {
    const server = createServer();
    const store = createStore(server);
    await loadBoth(store);
    const [alpha] = rowsOf(store, String(blogId), "Alpha");
    const context = { baseUrl: "/api", fetchImplementation: server.fetchImplementation };

    const outcome = await runMove(
      { context, store },
      [alpha as TreeItem],
      { position: "end", toFolder: newsId },
      true
    );
    await undoMove({ context, store }, outcome);

    expect(server.moveBodies[1]).toMatchObject({ position: "start", toFolder: blogId });
    expect(server.moveBodies[1]).not.toHaveProperty("after");
    expect(titlesIn(store, String(blogId))).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
  });

  it("splits a selection that came from different places into one request per place", () => {
    const snapshots = [
      { anchor: null, item: { collection: "pages", id: 1 }, parentId: blogId },
      {
        anchor: { collection: "pages", id: 2 },
        item: { collection: "pages", id: 3 },
        parentId: blogId,
      },
      {
        anchor: { collection: "pages", id: 2 },
        item: { collection: "pages", id: 4 },
        parentId: blogId,
      },
      { anchor: null, item: { collection: "pages", id: 9 }, parentId: null },
    ];
    const result = {
      changes: [],
      moved: snapshots.map((snapshot) => snapshot.item),
      orderKeys: { "pages:1": "k1", "pages:3": "k3", "pages:4": "k4", "pages:9": "k9" },
      revision: 4,
      structureRevisions: {},
    };

    const requests = buildUndoRequests(snapshots, result, newsId);

    expect(requests).toHaveLength(3);
    expect(requests[0]?.body).toMatchObject({ position: "start", toFolder: blogId });
    expect(requests[1]?.body).toMatchObject({ after: { collection: "pages", id: 2 } });
    expect(requests[1]?.body.items.map((item) => item.id)).toEqual([3, 4]);
    expect(requests[2]?.body).toMatchObject({ position: "start", toFolder: null });
    expect(requests[2]?.optimistic.toFolder).toBeNull();
  });

  it("leaves out an item the server did not move on its own", () => {
    const snapshots = [
      { anchor: null, item: { collection: "pages", id: 1 }, parentId: blogId },
      { anchor: null, item: { collection: "pages", id: 2 }, parentId: newsId },
    ];
    const result = {
      changes: [],
      moved: [{ collection: "pages", id: 1 }],
      orderKeys: { "pages:1": "k1" },
      revision: 4,
      structureRevisions: {},
    };

    const requests = buildUndoRequests(snapshots, result, 99);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.body.items.map((item) => item.id)).toEqual([1]);
  });

  it("is refused when a moved row was moved again, and leaves the rows where the move put them", async () => {
    const server = createServer();
    const store = createStore(server);
    await loadBoth(store);
    const [beta] = rowsOf(store, String(blogId), "Beta");
    const context = { baseUrl: "/api", fetchImplementation: server.fetchImplementation };
    const outcome = await runMove(
      { context, store },
      [beta as TreeItem],
      { position: "start", toFolder: newsId },
      true
    );

    // Someone else moves Beta out of News while the toast is still up.
    server.tree[String(newsId)] = (server.tree[String(newsId)] ?? []).filter(
      (row) => row.title !== "Beta"
    );
    server.tree[String(blogId)] = [
      ...(server.tree[String(blogId)] ?? []),
      page(2, "Beta", blogId, `/${blogId}/`),
    ];

    await expect(undoMove({ context, store }, outcome)).rejects.toMatchObject({ reason: "stale" });
    // The optimistic undo rolled back and the folders were read again: the store shows the server.
    expect(titlesIn(store, String(newsId))).toEqual(["Existing"]);
    expect(titlesIn(store, String(blogId))).toContain("Beta");
  });

  it("rolls the rows back when the move is refused, and sends the move as one request", async () => {
    const server = createServer();
    const store = createStore(server);
    await loadBoth(store);
    const rows = rowsOf(store, String(blogId), "Alpha", "Beta", "Gamma");
    const before = titlesIn(store, String(blogId));
    server.refuseNext = { reason: "forbidden", status: 403 };

    await expect(
      runMove(
        { context: { baseUrl: "/api", fetchImplementation: server.fetchImplementation }, store },
        rows,
        { position: "start", toFolder: newsId },
        true
      )
    ).rejects.toBeInstanceOf(FoldersApiError);

    expect(titlesIn(store, String(blogId))).toEqual(before);
    expect(titlesIn(store, String(newsId))).toEqual(["Existing"]);
    expect(server.moveBodies).toHaveLength(1);
    expect(server.moveBodies[0]?.items).toHaveLength(3);
  });

  it("carries the refusal reason of a stale move to the caller", async () => {
    const server = createServer();
    const store = createStore(server);
    await loadBoth(store);
    const [alpha] = rowsOf(store, String(blogId), "Alpha");
    server.refuseNext = { reason: "stale", status: 409 };

    const error = await runMove(
      { context: { baseUrl: "/api", fetchImplementation: server.fetchImplementation }, store },
      [alpha as TreeItem],
      { position: "start", toFolder: newsId },
      true
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FoldersApiError);
    expect((error as FoldersApiError).reason).toBe("stale");
    expect((error as FoldersApiError).status).toBe(409);
  });

  it("keeps item keys in the same shape the store uses", () => {
    expect(itemKeyOf({ collection: "pages", id: 3 })).toBe("pages:3");
  });
});
