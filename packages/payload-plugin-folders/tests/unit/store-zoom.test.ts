import { describe, expect, it, vi } from "vitest";

import {
  createTreeStore,
  findLoadedFolder,
  rootKey,
  viewRootKeyOf,
} from "../../src/admin/store.js";
import type { TreeStore } from "../../src/admin/store.js";
import type { TreeItem } from "../../src/types.js";

const access = { delete: true, publish: true, update: true };

const folder = (
  id: number,
  title: string,
  parentId: number | null,
  depth: number,
  childCount = 1
): TreeItem => ({
  access,
  ancestorIds: parentId === null ? "/" : `/${parentId}/`,
  childCount,
  collection: "folders",
  depth,
  fullPath: `/${title.toLowerCase()}`,
  hasRootPage: false,
  id,
  kind: "folder",
  orderKey: null,
  parentId,
  slug: title.toLowerCase(),
  slugIsFallback: false,
  titleIsFallback: false,
  structureRevision: 0,
  title,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const page = (id: number, title: string, parentId: number): TreeItem => ({
  access,
  collection: "pages",
  depth: 2,
  fullPath: `/${title.toLowerCase()}`,
  id,
  kind: "page",
  orderKey: null,
  parentId,
  slug: title.toLowerCase(),
  slugIsFallback: false,
  titleIsFallback: false,
  status: "published",
  structureRevision: 0,
  title,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const blogId = 10;
const yearId = 11;
const shopId = 12;

type Server = {
  ancestorsRequests: URL[];
  childrenRequests: URL[];
  failAncestors: boolean;
  fetchImplementation: typeof fetch;
  /** Titles by folder id, so a rename shows in the next breadcrumb read. */
  folders: Map<number, TreeItem>;
  /** While set, an ancestors request waits for it. */
  ancestorsGate: Promise<void> | null;
  missing: Set<number>;
  revision: number;
  tree: Record<string, TreeItem[]>;
};

const json = (body: unknown, status = 200) => Promise.resolve(Response.json(body, { status }));

const createServer = (): Server => {
  const blog = folder(blogId, "Blog", null, 1);
  const year = folder(yearId, "2026", blogId, 2);
  const shop = folder(shopId, "Shop", null, 1, 0);
  const server: Server = {
    ancestorsGate: null,
    ancestorsRequests: [],
    childrenRequests: [],
    failAncestors: false,
    fetchImplementation: vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.endsWith("/folders-tree/revision")) {
        return json({ revision: server.revision });
      }
      if (url.pathname.endsWith("/folders-tree/ancestors")) {
        server.ancestorsRequests.push(url);
        if (server.ancestorsGate) {
          await server.ancestorsGate;
        }
        if (server.failAncestors) {
          return json({ errors: [{ message: "The server is down" }] }, 500);
        }
        const id = Number(url.searchParams.get("id"));
        // A numeric id column refuses text with a 400 before it looks anything up.
        if (Number.isNaN(id)) {
          return json({ errors: [{ message: "`id` is not a valid id" }] }, 400);
        }
        const self = server.folders.get(id);
        if (!self || server.missing.has(id)) {
          return json({ errors: [{ message: "Not found" }] }, 404);
        }
        const chain: TreeItem[] = [];
        for (const ancestorId of (self.ancestorIds ?? "").split("/").filter(Boolean)) {
          chain.push(server.folders.get(Number(ancestorId)) as TreeItem);
        }

        return json({
          folders: chain.map((item) => ({
            fullPath: item.fullPath,
            id: item.id,
            name: item.title,
          })),
          item: self,
          items: chain,
        });
      }
      server.childrenRequests.push(url);
      const parent = url.searchParams.get("parent") ?? rootKey;
      if (
        parent !== rootKey &&
        (!server.folders.has(Number(parent)) || server.missing.has(Number(parent)))
      ) {
        return json({ errors: [{ message: "Not found" }] }, 404);
      }

      return json({
        hasMore: false,
        items: server.tree[parent] ?? [],
        nextCursor: null,
        revision: server.revision,
      });
    }) as unknown as typeof fetch,
    folders: new Map([
      [blogId, blog],
      [yearId, year],
      [shopId, shop],
    ]),
    missing: new Set(),
    revision: 5,
    tree: {
      [blogId]: [year, page(1, "Alpha", blogId)],
      [yearId]: [page(2, "Beta", yearId)],
      [rootKey]: [blog, shop],
    },
  };

  return server;
};

const createStore = (server: Server): TreeStore =>
  createTreeStore({
    baseUrl: "/api",
    fetchImplementation: server.fetchImplementation,
    locale: "en",
    pageSize: 100,
  });

const titlesIn = (store: TreeStore, folderKey: string): string[] =>
  (store.getState().childrenByFolder[folderKey]?.items ?? []).map((item) => item.title);

describe("zooming", () => {
  it("opens straight on a folder: its rows are the view's, with the breadcrumbs read beside them", async () => {
    const server = createServer();
    const store = createStore(server);

    await store.setZoom(yearId);

    const state = store.getState();
    expect(viewRootKeyOf(state)).toBe("11");
    expect(titlesIn(store, "11")).toEqual(["Beta"]);
    // The top level was never read: the view starts at the zoomed folder.
    expect(state.childrenByFolder[rootKey]).toBeUndefined();
    expect(state.zoom?.chain?.map((item) => item.title)).toEqual(["Blog", "2026"]);
    expect(state.zoom?.error).toBeNull();
    // One breadcrumb read asks for the rows too, so a drop on a crumb is checked like a drop on a row.
    expect(server.ancestorsRequests).toHaveLength(1);
    expect(server.ancestorsRequests[0]?.searchParams.get("withItems")).toBe("1");
    expect(server.ancestorsRequests[0]?.searchParams.get("collection")).toBe("folders");
  });

  it("finds the zoomed folder's row, and a breadcrumb's, when no parent has loaded them", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.setZoom(yearId);

    expect(findLoadedFolder(store.getState(), yearId)?.title).toBe("2026");
    expect(findLoadedFolder(store.getState(), blogId)?.title).toBe("Blog");
    expect(findLoadedFolder(store.getState(), null)).toBeNull();
    expect(findLoadedFolder(store.getState(), shopId)).toBeNull();
  });

  it("shows the breadcrumbs from rows already read, before the read for them answers", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.loadChildren(null);
    await store.setExpanded(blogId, true);
    server.ancestorsGate = new Promise(() => undefined);

    void store.setZoom(yearId);

    // Blog and 2026 are loaded rows, so the breadcrumbs exist without waiting.
    expect(store.getState().zoom?.chain?.map((item) => item.title)).toEqual(["Blog", "2026"]);
  });

  it("leaves the breadcrumbs empty until they are read when a row is missing", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.loadChildren(null);
    server.ancestorsGate = new Promise(() => undefined);

    // 2026 is inside Blog, which was never opened.
    void store.setZoom(yearId);

    expect(store.getState().zoom).toMatchObject({ chain: null, error: null, folderId: yearId });
  });

  it("goes back to the top level, whose rows are still there", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.loadChildren(null);
    await store.setZoom(blogId);

    await store.setZoom(null);

    expect(store.getState().zoom).toBeNull();
    expect(viewRootKeyOf(store.getState())).toBe(rootKey);
    expect(titlesIn(store, rootKey)).toEqual(["Blog", "Shop"]);
  });

  it("says a folder that is gone is not found, and keeps no breadcrumbs for it", async () => {
    const server = createServer();
    server.missing.add(yearId);
    const store = createStore(server);

    await store.setZoom(yearId);

    expect(store.getState().zoom).toEqual({ chain: null, error: "not-found", folderId: yearId });
  });

  it("says an id the server refuses as malformed is not found too, not a failed read", async () => {
    const server = createServer();
    const store = createStore(server);

    await store.setZoom("abc");

    expect(store.getState().zoom).toEqual({ chain: null, error: "not-found", folderId: "abc" });
  });

  it("keeps the breadcrumbs it has when a later read of them fails for another reason", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.setZoom(yearId);
    await store.pollRevision();
    server.failAncestors = true;
    server.revision = 6;

    await store.pollRevision();

    const { zoom } = store.getState();
    expect(zoom?.error).toBe("failed");
    expect(zoom?.chain?.map((item) => item.title)).toEqual(["Blog", "2026"]);
  });

  it("shows a read that fails at once as failed, with no breadcrumbs", async () => {
    const server = createServer();
    server.failAncestors = true;
    const store = createStore(server);

    await store.setZoom(yearId);

    expect(store.getState().zoom).toEqual({ chain: null, error: "failed", folderId: yearId });
  });

  it("does nothing when asked to zoom into the folder it is in", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.setZoom(yearId);

    await store.setZoom(yearId);

    expect(server.ancestorsRequests).toHaveLength(1);
    expect(server.childrenRequests).toHaveLength(1);
  });

  it("drops the answer of a zoom the editor has already left", async () => {
    const server = createServer();
    const store = createStore(server);
    let release: (() => void) | undefined;
    server.ancestorsGate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const zooming = store.setZoom(yearId);
    await store.setZoom(null);
    release?.();
    await zooming;

    expect(store.getState().zoom).toBeNull();
  });

  it("reads the breadcrumbs again when the tree changed, so a rename shows", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.setZoom(yearId);
    await store.pollRevision();
    server.folders.set(blogId, { ...folder(blogId, "Journal", null, 1) });
    server.revision = 6;

    await store.pollRevision();

    expect(store.getState().zoom?.chain?.map((item) => item.title)).toEqual(["Journal", "2026"]);
  });

  it("settles on a revision when opened straight on a folder, so a later change is noticed", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.setZoom(yearId);
    expect(store.getState().revision).toBe(5);
    const reads = server.childrenRequests.length;

    server.revision = 6;
    await store.pollRevision();

    expect(server.childrenRequests.length).toBeGreaterThan(reads);
    expect(store.getState().revision).toBe(6);
  });

  it("keeps the zoom, and reads its breadcrumbs again, when the language changes", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.setZoom(yearId);
    const reads = server.ancestorsRequests.length;

    store.configure({
      baseUrl: "/api",
      fetchImplementation: server.fetchImplementation,
      locale: "de",
      pageSize: 100,
    });

    expect(store.getState().zoom?.folderId).toBe(yearId);
    expect(store.getState().zoom?.chain).toBeNull();
    await vi.waitFor(() => expect(server.ancestorsRequests.length).toBe(reads + 1));
    await vi.waitFor(() => expect(store.getState().zoom?.chain).toHaveLength(2));
    expect(server.ancestorsRequests.at(-1)?.searchParams.get("locale")).toBe("de");
  });
});

describe("replacing the open folders", () => {
  it("opens exactly the folders it is given, reading their rows as the folders above show", async () => {
    const server = createServer();
    const store = createStore(server);
    // The address names the open folders before any row is read.
    await store.replaceExpanded([blogId, yearId]);
    await store.loadChildren(null);

    expect(store.getState().expanded).toEqual(["10", "11"]);
    expect(titlesIn(store, "10")).toEqual(["2026", "Alpha"]);
    expect(titlesIn(store, "11")).toEqual(["Beta"]);
  });

  it("closes the folders it does not name, and reads the ones rows are already loaded for", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.loadChildren(null);
    await store.setExpanded(shopId, true);

    await store.replaceExpanded([blogId]);

    expect(store.getState().expanded).toEqual(["10"]);
    expect(titlesIn(store, "10")).toEqual(["2026", "Alpha"]);
  });

  it("changes nothing, and writes no state, for the list it already has", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.replaceExpanded([blogId]);
    const listener = vi.fn();
    store.subscribe(listener);

    await store.replaceExpanded([blogId]);

    expect(listener).not.toHaveBeenCalled();
  });

  it("forgets a repeated id", async () => {
    const server = createServer();
    const store = createStore(server);

    await store.replaceExpanded([blogId, blogId]);

    expect(store.getState().expanded).toEqual(["10"]);
  });
});

describe("retaining the full tree for the sidebar tab", () => {
  it("keeps the folders under the top level current while the tree view is zoomed elsewhere", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.loadChildren(null);
    await store.setExpanded(shopId, true);
    await store.setZoom(yearId);
    await store.pollRevision();
    server.childrenRequests.length = 0;

    server.revision = 6;
    await store.pollRevision();
    const withoutTab = server.childrenRequests.map((request) => request.searchParams.get("parent"));

    const release = store.retainFullTree();
    server.childrenRequests.length = 0;
    server.revision = 7;
    await store.pollRevision();
    const withTab = server.childrenRequests.map((request) => request.searchParams.get("parent"));
    release();

    // Zoomed into 2026, only that folder is read; with the tab mounted the top level is read too,
    // and the open Shop under it.
    expect(withoutTab).toEqual([String(yearId)]);
    expect(withTab).toEqual(expect.arrayContaining([String(yearId), rootKey, String(shopId)]));
  });

  it("goes back to reading only the zoomed folder once the tab lets go", async () => {
    const server = createServer();
    const store = createStore(server);
    await store.loadChildren(null);
    await store.setZoom(yearId);
    await store.pollRevision();
    const release = store.retainFullTree();
    release();
    release();
    server.childrenRequests.length = 0;

    server.revision = 6;
    await store.pollRevision();

    expect(server.childrenRequests.map((request) => request.searchParams.get("parent"))).toEqual([
      String(yearId),
    ]);
  });
});
