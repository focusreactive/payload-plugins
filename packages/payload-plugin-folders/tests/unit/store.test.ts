import { describe, expect, it, vi } from "vitest";

import { createTreeStore, folderKeyOf, rootKey } from "../../src/admin/store.js";
import type { TreeStore } from "../../src/admin/store.js";
import type { TreeItem } from "../../src/types.js";

const allowed = { delete: true, publish: true, update: true };

const folder = (id: number, title: string, childCount: number, parentId: number | null = null) =>
  ({
    access: allowed,
    childCount,
    collection: "folders",
    depth: parentId === null ? 0 : 1,
    fullPath: `/${title.toLowerCase()}`,
    hasRootPage: false,
    id,
    kind: "folder",
    orderKey: null,
    parentId,
    slug: title.toLowerCase(),
    slugIsFallback: false,
    structureRevision: 0,
    title,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }) satisfies TreeItem;

const page = (id: number, title: string, parentId: number | null) =>
  ({
    access: allowed,
    collection: "pages",
    depth: parentId === null ? 0 : 1,
    fullPath: `/${title.toLowerCase()}`,
    id,
    kind: "page",
    orderKey: null,
    parentId,
    slug: title.toLowerCase(),
    slugIsFallback: false,
    status: "published",
    structureRevision: 0,
    title,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }) satisfies TreeItem;

const blogId = 10;
const productsId = 11;

const freshTree = (): Record<string, TreeItem[]> => ({
  [blogId]: [page(1, "Alpha", blogId), page(2, "Beta", blogId)],
  [productsId]: [page(3, "Gamma", productsId)],
  [rootKey]: [folder(blogId, "Blog", 2), folder(productsId, "Products", 1)],
});

type FakeServer = {
  childrenRequests: URL[];
  failChildren: boolean;
  fetchImplementation: typeof fetch;
  revision: number;
  tree: Record<string, TreeItem[]>;
};

const json = (body: unknown, status = 200) => Promise.resolve(Response.json(body, { status }));

/** Answers the two endpoints the store calls from an in-memory tree, with the real cursor shape. */
const createServer = (tree: Record<string, TreeItem[]> = freshTree()): FakeServer => {
  const server: FakeServer = {
    childrenRequests: [],
    failChildren: false,
    fetchImplementation: vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.endsWith("/folders-tree/revision")) {
        return json({ revision: server.revision });
      }
      server.childrenRequests.push(url);
      if (server.failChildren) {
        return json({ errors: [{ message: "The server is down" }] }, 500);
      }
      const rows = server.tree[url.searchParams.get("parent") ?? rootKey] ?? [];
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const start = Number(url.searchParams.get("cursor") ?? 0);
      const end = start + limit;

      return json({
        hasMore: end < rows.length,
        items: rows.slice(start, end),
        nextCursor: end < rows.length ? String(end) : null,
        revision: server.revision,
      });
    }) as unknown as typeof fetch,
    revision: 5,
    tree,
  };

  return server;
};

const createStore = (server: FakeServer, pageSize = 100): TreeStore =>
  createTreeStore({
    baseUrl: "/api",
    fetchImplementation: server.fetchImplementation,
    locale: "en",
    pageSize,
  });

const titlesIn = (store: TreeStore, folderKey: string): string[] =>
  (store.getState().childrenByFolder[folderKey]?.items ?? []).map((item) => item.title);

const rowIn = (store: TreeStore, folderKey: string, title: string): TreeItem | undefined =>
  store.getState().childrenByFolder[folderKey]?.items.find((item) => item.title === title);

/** Every cached row by folder, without the entry flags a failed refetch sets. */
const itemsByFolder = (store: TreeStore): Record<string, readonly TreeItem[]> =>
  Object.fromEntries(
    Object.entries(store.getState().childrenByFolder).map(([key, entry]) => [
      key,
      structuredClone(entry.items),
    ])
  );

const openBoth = async (store: TreeStore): Promise<void> => {
  await store.loadChildren(null);
  await store.setExpanded(blogId, true);
  await store.setExpanded(productsId, true);
};

const deferred = <Value>() => {
  let settleResolve!: (value: Value) => void;
  let settleReject!: (error: Error) => void;
  const promise = new Promise<Value>((resolve, reject) => {
    settleResolve = resolve;
    settleReject = reject;
  });

  return { promise, reject: settleReject, resolve: settleResolve };
};

describe("the tree store", () => {
  it("store applies and rolls back an optimistic move", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);
    const before = itemsByFolder(store);

    const request = deferred<string>();
    const move = store.runOptimisticMove(
      { items: [{ collection: "pages", id: 1 }], toFolder: productsId },
      () => request.promise
    );

    // Applied at once, before the server has answered.
    expect(titlesIn(store, String(blogId))).toEqual(["Beta"]);
    expect(titlesIn(store, String(productsId))).toEqual(["Alpha", "Gamma"]);
    expect(rowIn(store, String(productsId), "Alpha")?.parentId).toBe(productsId);
    expect(rowIn(store, rootKey, "Blog")?.childCount).toBe(1);
    expect(rowIn(store, rootKey, "Products")?.childCount).toBe(2);

    // The refresh that follows a failure fails too, so what remains is the rollback alone.
    server.failChildren = true;
    request.reject(new Error("The move was refused"));
    await expect(move).rejects.toThrow("The move was refused");

    expect(itemsByFolder(store)).toEqual(before);
  });

  it("store keeps an optimistic move and reads the affected folders again once the server accepts it", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);

    await store.runOptimisticMove(
      { items: [{ collection: "pages", id: 1 }], toFolder: productsId },
      () => {
        // What the server does: the page leaves blog and lands first in products.
        server.tree[blogId] = [page(2, "Beta", blogId)];
        server.tree[productsId] = [page(1, "Alpha", productsId), page(3, "Gamma", productsId)];
        server.tree[rootKey] = [folder(blogId, "Blog", 1), folder(productsId, "Products", 2)];
        server.revision = 6;

        return Promise.resolve("done");
      }
    );

    expect(titlesIn(store, String(blogId))).toEqual(["Beta"]);
    expect(titlesIn(store, String(productsId))).toEqual(["Alpha", "Gamma"]);
    expect(store.getState().revision).toBe(6);
    // Blog and products, the two folders the move touched, were read again after the answer.
    const refreshed = server.childrenRequests.slice(3).map((url) => url.searchParams.get("parent"));
    expect(refreshed.toSorted()).toEqual(["10", "11"]);
  });

  it("store places a moved row after a named sibling and puts it back on rollback", async () => {
    const server = createServer();
    server.tree[productsId] = [page(3, "Gamma", productsId), page(4, "Delta", productsId)];
    const store = createStore(server);
    await openBoth(store);
    const before = itemsByFolder(store);

    const handle = store.applyOptimisticMove({
      after: { collection: "pages", id: 3 },
      items: [{ collection: "pages", id: 2 }],
      toFolder: productsId,
    });

    expect(titlesIn(store, String(productsId))).toEqual(["Gamma", "Beta", "Delta"]);
    expect(handle.affectedParents.toSorted()).toEqual(["10", "11"]);

    handle.rollback();

    expect(itemsByFolder(store)).toEqual(before);
  });

  it("store rolls back a reorder inside one folder to the original order", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);
    const before = itemsByFolder(store);

    const handle = store.applyOptimisticMove({
      items: [{ collection: "pages", id: 1 }],
      position: "end",
      toFolder: blogId,
    });

    expect(titlesIn(store, String(blogId))).toEqual(["Beta", "Alpha"]);
    // The count of the folder it never left stays the same.
    expect(rowIn(store, rootKey, "Blog")?.childCount).toBe(2);

    handle.rollback();

    expect(itemsByFolder(store)).toEqual(before);
  });

  it("store does not insert at the end of a folder that has more rows to load", async () => {
    const server = createServer();
    server.tree[productsId] = [page(3, "Gamma", productsId), page(4, "Delta", productsId)];
    const store = createStore(server, 1);
    await store.loadChildren(null);
    await store.loadChildren(blogId);
    await store.loadChildren(productsId);

    store.applyOptimisticMove({
      items: [{ collection: "pages", id: 1 }],
      position: "end",
      toFolder: productsId,
    });

    // The end is not known yet, so the row is not placed and the folder waits for its refresh.
    expect(titlesIn(store, String(productsId))).toEqual(["Gamma"]);
    expect(store.getState().childrenByFolder[String(productsId)]?.stale).toBe(true);
  });

  it("store refetches when the revision changes", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);
    expect(server.childrenRequests).toHaveLength(3);
    expect(store.getState().revision).toBe(5);

    await store.pollRevision();
    // Same revision: nothing is read again.
    expect(server.childrenRequests).toHaveLength(3);

    server.tree[blogId] = [...(server.tree[blogId] as TreeItem[]), page(7, "Omega", blogId)];
    server.revision = 6;
    await store.pollRevision();

    // The root and both opened folders are read again, and the new row shows.
    expect(server.childrenRequests).toHaveLength(6);
    expect(titlesIn(store, String(blogId))).toEqual(["Alpha", "Beta", "Omega"]);
    expect(store.getState().revision).toBe(6);
  });

  it("store skips a revision poll while an optimistic change is in flight", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);

    const handle = store.applyOptimisticMove({
      items: [{ collection: "pages", id: 1 }],
      toFolder: productsId,
    });
    server.revision = 6;
    await store.pollRevision();

    // A read now would bring back the tree without the move and undo it on screen.
    expect(server.childrenRequests).toHaveLength(3);
    expect(titlesIn(store, String(productsId))).toEqual(["Alpha", "Gamma"]);

    handle.rollback();
  });

  it("store keeps a failed poll quiet and tries again on the next one", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);
    const failing = vi.fn(() => Promise.reject(new Error("offline")));
    store.configure({
      baseUrl: "/api",
      fetchImplementation: failing as unknown as typeof fetch,
      locale: "en",
      pageSize: 100,
    });

    await expect(store.pollRevision()).resolves.toBeUndefined();

    expect(titlesIn(store, String(blogId))).toEqual(["Alpha", "Beta"]);
  });

  it("store loads the next page with the cursor and appends it without repeating a row", async () => {
    const server = createServer();
    server.tree[rootKey] = [
      folder(blogId, "Blog", 2),
      folder(productsId, "Products", 1),
      page(20, "Third", null),
    ];
    const store = createStore(server, 2);

    await store.loadChildren(null);
    expect(titlesIn(store, rootKey)).toEqual(["Blog", "Products"]);
    expect(store.getState().childrenByFolder[rootKey]?.hasMore).toBe(true);

    await store.loadMore(null);

    expect(titlesIn(store, rootKey)).toEqual(["Blog", "Products", "Third"]);
    expect(store.getState().childrenByFolder[rootKey]?.hasMore).toBe(false);
    const cursor = server.childrenRequests.at(-1)?.searchParams.get("cursor");
    expect(cursor).toBe("2");
  });

  it("store shows a failed first load as an error and loads again on retry", async () => {
    const server = createServer();
    server.failChildren = true;
    const store = createStore(server);

    await store.loadChildren(null);

    const failed = store.getState().childrenByFolder[rootKey];
    expect(failed?.phase).toBe("error");
    expect(failed?.error).toBe("The server is down");

    server.failChildren = false;
    await store.loadChildren(null);

    expect(store.getState().childrenByFolder[rootKey]?.phase).toBe("loaded");
    expect(titlesIn(store, rootKey)).toEqual(["Blog", "Products"]);
  });

  it("store keeps the rows of a folder whose refresh failed and marks them out of date", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);

    server.failChildren = true;
    await store.invalidate([blogId]);

    const entry = store.getState().childrenByFolder[String(blogId)];
    expect(entry?.items.map((item) => item.title)).toEqual(["Alpha", "Beta"]);
    expect(entry?.stale).toBe(true);
    expect(entry?.error).toBe("The server is down");
  });

  it("store reads the open folders again when the top level loads after a locale change", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);
    store.configure({
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "de",
      pageSize: 100,
    });
    expect(store.getState().childrenByFolder).toEqual({});

    await store.loadChildren(null);

    // Nobody asks for blog and products: they were open, so their parent's answer opens them.
    await vi.waitFor(() => {
      expect(titlesIn(store, String(blogId))).toEqual(["Alpha", "Beta"]);
      expect(titlesIn(store, String(productsId))).toEqual(["Gamma"]);
    });
  });

  it("store forgets its rows but keeps the open folders when the locale changes", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);

    store.configure({
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "de",
      pageSize: 100,
    });

    expect(store.getState().childrenByFolder).toEqual({});
    expect(store.getState().expanded).toEqual([String(blogId), String(productsId)]);
    expect(store.getState().revision).toBeNull();
  });

  it("store ignores an answer to a request that a newer one replaced", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);

    const slowAnswer = deferred<Response>();
    const send = vi.fn(() => slowAnswer.promise);
    store.configure({
      baseUrl: "/api",
      fetchImplementation: send as unknown as typeof fetch,
      locale: "en",
      pageSize: 100,
    });
    const slowRefresh = store.invalidate([blogId]);

    // The newer request comes from the real server and wins.
    server.tree[blogId] = [page(9, "Newest", blogId)];
    store.configure({
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "en",
      pageSize: 100,
    });
    await store.invalidate([blogId]);
    expect(titlesIn(store, String(blogId))).toEqual(["Newest"]);

    slowAnswer.resolve(
      Response.json({
        hasMore: false,
        items: [page(1, "Alpha", blogId)],
        nextCursor: null,
        revision: 5,
      })
    );
    await slowRefresh;

    expect(titlesIn(store, String(blogId))).toEqual(["Newest"]);
  });

  it("store keys the top level as root and every folder by its id", () => {
    expect(folderKeyOf(null)).toBe("root");
    expect(folderKeyOf(42)).toBe("42");
    expect(folderKeyOf("abc")).toBe("abc");
  });
});
