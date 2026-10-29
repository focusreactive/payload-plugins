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
  /** Parents (a folder id or `root`) whose children requests answer 403. */
  failParents: Set<string>;
  fetchImplementation: typeof fetch;
  /** While set, children requests wait for it before they are answered. */
  gate: Promise<void> | null;
  revision: number;
  revisionRequests: number;
  tree: Record<string, TreeItem[]>;
};

const json = (body: unknown, status = 200) => Promise.resolve(Response.json(body, { status }));

/** Answers the two endpoints the store calls from an in-memory tree, with the real cursor shape. */
const createServer = (tree: Record<string, TreeItem[]> = freshTree()): FakeServer => {
  const server: FakeServer = {
    childrenRequests: [],
    failChildren: false,
    failParents: new Set<string>(),
    fetchImplementation: vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.endsWith("/folders-tree/revision")) {
        server.revisionRequests += 1;

        return json({ revision: server.revision });
      }
      server.childrenRequests.push(url);
      const parent = url.searchParams.get("parent") ?? rootKey;
      // The answer is read when the request arrives, as a real server would, then held back.
      const rows = server.tree[parent] ?? [];
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const start = Number(url.searchParams.get("cursor") ?? 0);
      const end = start + limit;
      const answer = {
        hasMore: end < rows.length,
        items: rows.slice(start, end),
        nextCursor: end < rows.length ? String(end) : null,
        revision: server.revision,
      };
      if (server.gate) {
        await server.gate;
      }
      if (server.failChildren) {
        return json({ errors: [{ message: "The server is down" }] }, 500);
      }
      if (server.failParents.has(parent)) {
        return json({ errors: [{ message: "Forbidden" }] }, 403);
      }

      return json(answer);
    }) as unknown as typeof fetch,
    gate: null,
    revision: 5,
    revisionRequests: 0,
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
    // Blog and products, the two folders the move touched, and root, which holds their counts.
    const refreshed = server.childrenRequests.slice(3).map((url) => url.searchParams.get("parent"));
    expect(refreshed.toSorted()).toEqual(["10", "11", "root"]);
    // A move's own answers do not tell the store the whole tree matches revision 6: the poll does.
    expect(store.getState().revision).toBe(5);
    await store.pollRevision();
    expect(store.getState().revision).toBe(6);
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

  it("store refreshes the folders on screen when a read of another folder carries a newer revision", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.loadChildren(null);
    await store.setExpanded(blogId, true);
    // Another editor moves Alpha out of blog before this tab's next poll.
    server.tree[blogId] = [page(2, "Beta", blogId)];
    server.tree[productsId] = [page(1, "Alpha", productsId), page(3, "Gamma", productsId)];
    server.revision = 6;

    await store.setExpanded(productsId, true);

    await vi.waitFor(() => {
      expect(titlesIn(store, String(blogId))).toEqual(["Beta"]);
      expect(store.getState().revision).toBe(6);
    });
    const requestsBeforePoll = server.childrenRequests.length;
    await store.pollRevision();
    expect(server.childrenRequests).toHaveLength(requestsBeforePoll);
  });

  it("store reads rows again that a failed refresh left out of date, with no change of revision", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);
    server.failChildren = true;
    await store.invalidate([blogId]);
    expect(store.getState().childrenByFolder[String(blogId)]?.stale).toBe(true);

    server.failChildren = false;
    server.tree[blogId] = [page(2, "Beta", blogId)];
    await store.pollRevision();

    const entry = store.getState().childrenByFolder[String(blogId)];
    expect(entry?.stale).toBe(false);
    expect(entry?.error).toBeNull();
    expect(titlesIn(store, String(blogId))).toEqual(["Beta"]);
  });

  it("store keeps a poll's refresh when Load more is clicked while it is in flight", async () => {
    const server = createServer();
    server.tree[blogId] = [
      page(1, "Alpha", blogId),
      page(2, "Beta", blogId),
      page(4, "Extra", blogId),
    ];
    const store = createStore(server, 2);
    await store.loadChildren(null);
    await store.setExpanded(blogId, true);
    expect(store.getState().childrenByFolder[String(blogId)]?.hasMore).toBe(true);

    // Another editor deletes Alpha; the poll's refresh is on its way when the click comes.
    server.tree[blogId] = [page(2, "Beta", blogId), page(4, "Extra", blogId)];
    server.revision = 6;
    const gate = deferred<void>();
    server.gate = gate.promise;
    const requestsBefore = server.childrenRequests.length;
    const poll = store.pollRevision();
    await vi.waitFor(() => {
      expect(server.childrenRequests.length).toBeGreaterThan(requestsBefore);
    });
    const click = store.loadMore(blogId);
    gate.resolve();
    await poll;
    await click;

    expect(titlesIn(store, String(blogId))).toEqual(["Beta", "Extra"]);
    expect(store.getState().childrenByFolder[String(blogId)]?.stale).toBe(false);
  });

  it("store refreshes the cached rows below a moved folder, whose paths changed", async () => {
    const server = createServer();
    const inBlog = (title: string, path: string): TreeItem => ({
      ...page(title === "Alpha" ? 1 : 2, title, blogId),
      fullPath: path,
    });
    server.tree[blogId] = [inBlog("Alpha", "/blog/alpha"), inBlog("Beta", "/blog/beta")];
    const store = createStore(server);
    await openBoth(store);
    expect(rowIn(store, String(blogId), "Alpha")?.fullPath).toBe("/blog/alpha");

    await store.runOptimisticMove(
      { items: [{ collection: "folders", id: blogId }], toFolder: productsId },
      () => {
        // The server moves the folder; every path below it changes.
        server.tree[rootKey] = [folder(productsId, "Products", 2)];
        server.tree[productsId] = [
          folder(blogId, "Blog", 2, productsId),
          page(3, "Gamma", productsId),
        ];
        server.tree[blogId] = [
          inBlog("Alpha", "/products/blog/alpha"),
          inBlog("Beta", "/products/blog/beta"),
        ];
        server.revision = 6;

        return Promise.resolve("done");
      }
    );

    expect(rowIn(store, String(blogId), "Alpha")?.fullPath).toBe("/products/blog/alpha");
    expect(rowIn(store, String(blogId), "Beta")?.fullPath).toBe("/products/blog/beta");
  });

  it("store restores the child counts a move changed, even when a read replaced them meanwhile", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);

    const request = deferred<string>();
    const move = store.runOptimisticMove(
      { items: [{ collection: "pages", id: 1 }], toFolder: productsId },
      () => request.promise
    );
    expect(rowIn(store, rootKey, "Blog")?.childCount).toBe(1);
    // Another commit reads the top level again: the server has not moved anything yet.
    await store.invalidate([null]);
    expect(rowIn(store, rootKey, "Blog")?.childCount).toBe(2);

    request.reject(new Error("The move was refused"));
    await expect(move).rejects.toThrow("The move was refused");

    expect(rowIn(store, rootKey, "Blog")?.childCount).toBe(2);
    expect(rowIn(store, rootKey, "Products")?.childCount).toBe(1);
  });

  it("store drops the cache and the open folders when another user signs in", async () => {
    const server = createServer();
    const store = createTreeStore({
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "en",
      pageSize: 100,
      userId: 1,
    });
    await openBoth(store);

    // The same user again changes nothing.
    store.configure({
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "en",
      pageSize: 100,
      userId: 1,
    });
    expect(Object.keys(store.getState().childrenByFolder)).toHaveLength(3);

    store.configure({
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "en",
      pageSize: 100,
      userId: 2,
    });

    expect(store.getState().childrenByFolder).toEqual({});
    expect(store.getState().expanded).toEqual([]);
    expect(store.getState().revision).toBeNull();
  });

  it("store polls once however many trees ask for polling, and stops with the last one", async () => {
    vi.useFakeTimers();
    try {
      const server = createServer();
      const store = createStore(server);
      const stopFirst = store.startPolling();
      const stopSecond = store.startPolling();

      await vi.advanceTimersByTimeAsync(10_000);
      expect(server.revisionRequests).toBe(1);

      stopFirst();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(server.revisionRequests).toBe(2);

      stopSecond();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(server.revisionRequests).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("store sends one revision request for polls that overlap", async () => {
    const server = createServer();
    const store = createStore(server);

    await Promise.all([store.pollRevision(), store.pollRevision()]);

    expect(server.revisionRequests).toBe(1);
    await store.pollRevision();
    expect(server.revisionRequests).toBe(2);
  });

  it("store does not poll while the tab is hidden", async () => {
    vi.stubGlobal("document", { hidden: true });
    try {
      const server = createServer();
      const store = createStore(server);

      await store.pollRevision();

      expect(server.revisionRequests).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("store leaves the baseline to the first answer, not to a poll that came in before it", async () => {
    const server = createServer();
    const store = createStore(server);
    const gate = deferred<void>();
    server.gate = gate.promise;
    const load = store.loadChildren(null);
    await vi.waitFor(() => {
      expect(server.childrenRequests).toHaveLength(1);
    });
    // Another editor adds a folder after the top level was read at revision 5.
    server.tree[rootKey] = [...(server.tree[rootKey] as TreeItem[]), folder(12, "Archive", 0)];
    server.revision = 6;

    await store.pollRevision();
    expect(store.getState().revision).toBeNull();
    gate.resolve();
    await load;
    server.gate = null;

    // The rows that landed are the old ones, so the poll that follows must read them again.
    expect(titlesIn(store, rootKey)).toEqual(["Blog", "Products"]);
    expect(store.getState().revision).toBe(5);
    await store.pollRevision();
    expect(titlesIn(store, rootKey)).toEqual(["Blog", "Products", "Archive"]);
    expect(store.getState().revision).toBe(6);
  });

  it("store ignores Load more while a refresh of the folder is in flight, with no change of revision", async () => {
    const server = createServer();
    server.tree[blogId] = [
      page(1, "Alpha", blogId),
      page(2, "Beta", blogId),
      page(4, "Extra", blogId),
    ];
    const store = createStore(server, 2);
    await store.loadChildren(null);
    await store.setExpanded(blogId, true);
    expect(store.getState().childrenByFolder[String(blogId)]?.hasMore).toBe(true);

    // A page is renamed in its edit view. The revision does not move: a rename is no tree change.
    server.tree[blogId] = [
      { ...page(1, "Alpha", blogId), title: "Alpha renamed" },
      page(2, "Beta", blogId),
      page(4, "Extra", blogId),
    ];
    const gate = deferred<void>();
    server.gate = gate.promise;
    const requestsBefore = server.childrenRequests.length;
    // The user comes back to the view, which reads what is on screen again.
    const refresh = store.refetchVisible();
    await vi.waitFor(() => {
      expect(server.childrenRequests.length).toBeGreaterThan(requestsBefore);
    });
    // The rows are being replaced, so the button has to show it.
    expect(store.getState().childrenByFolder[String(blogId)]?.refreshing).toBe(true);
    const click = store.loadMore(blogId);
    gate.resolve();
    await refresh;
    await click;

    // The refresh keeps the two rows shown; the click was ignored, so the third is still to load.
    expect(titlesIn(store, String(blogId))).toEqual(["Alpha renamed", "Beta"]);
    expect(store.getState().childrenByFolder[String(blogId)]?.refreshing).toBe(false);
    expect(store.getState().childrenByFolder[String(blogId)]?.hasMore).toBe(true);

    await store.loadMore(blogId);

    expect(titlesIn(store, String(blogId))).toEqual(["Alpha renamed", "Beta", "Extra"]);
  });

  it("store does not write a refused move of the previous user into the next user's rows", async () => {
    const server = createServer();
    const options = {
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "en",
      pageSize: 100,
    };
    const store = createTreeStore({ ...options, userId: 1 });
    await openBoth(store);
    const handle = store.applyOptimisticMove({
      items: [{ collection: "pages", id: 1 }],
      toFolder: productsId,
    });

    // User 2 signs in and can see only Beta in blog.
    server.tree[blogId] = [page(2, "Beta", blogId)];
    store.configure({ ...options, userId: 2 });
    await store.loadChildren(null);
    await store.setExpanded(blogId, true);
    expect(titlesIn(store, String(blogId))).toEqual(["Beta"]);

    handle.rollback();

    expect(titlesIn(store, String(blogId))).toEqual(["Beta"]);
    expect(rowIn(store, rootKey, "Blog")?.childCount).toBe(2);
  });

  it("store does not read the next user's folders again after the previous user's move is refused", async () => {
    const server = createServer();
    const options = {
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "en",
      pageSize: 100,
    };
    const store = createTreeStore({ ...options, userId: 1 });
    await openBoth(store);
    const request = deferred<string>();
    const move = store.runOptimisticMove(
      { items: [{ collection: "pages", id: 1 }], toFolder: productsId },
      () => request.promise
    );
    store.configure({ ...options, userId: 2 });
    await store.loadChildren(null);
    await store.setExpanded(blogId, true);
    const requestsBefore = server.childrenRequests.length;

    request.reject(new Error("The move was refused"));
    await expect(move).rejects.toThrow("The move was refused");

    expect(server.childrenRequests).toHaveLength(requestsBefore);
    // The move is over, so polling is not held back for good.
    await store.pollRevision();
    expect(server.revisionRequests).toBe(1);
  });

  it("store reads only the folders that failed when a poll finds the revision unchanged", async () => {
    const server = createServer();
    const store = createStore(server);
    await openBoth(store);
    server.failParents.add(String(blogId));
    await store.invalidate([blogId]);
    expect(store.getState().childrenByFolder[String(blogId)]?.stale).toBe(true);

    for (const expected of [1, 2, 3]) {
      const before = server.childrenRequests.length;
      await store.pollRevision();
      // One request for the folder that keeps failing, none for the two that are current.
      expect(server.childrenRequests).toHaveLength(before + 1);
      expect(server.childrenRequests.at(-1)?.searchParams.get("parent")).toBe(String(blogId));
      expect(expected).toBeGreaterThan(0);
    }
    expect(store.getState().revision).toBe(5);

    // The revision moves while blog is still failing: every folder is behind, the seen revision
    // waits for the failing one.
    server.revision = 6;
    const beforeMove = server.childrenRequests.length;
    await store.pollRevision();
    expect(server.childrenRequests).toHaveLength(beforeMove + 3);
    expect(store.getState().revision).toBe(5);

    // Blog recovers: only it is read, and the seen revision is the lowest of the visible folders.
    server.failParents.clear();
    const beforeRecovery = server.childrenRequests.length;
    await store.pollRevision();
    expect(server.childrenRequests).toHaveLength(beforeRecovery + 1);
    expect(store.getState().revision).toBe(6);
  });

  it("store keys the top level as root and every folder by its id", () => {
    expect(folderKeyOf(null)).toBe("root");
    expect(folderKeyOf(42)).toBe("42");
    expect(folderKeyOf("abc")).toBe("abc");
  });
});
