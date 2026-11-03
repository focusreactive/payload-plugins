import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createReorderController, reorderDelayMs } from "../../src/admin/Keyboard/reorder.js";
import type { ReorderCommit } from "../../src/admin/Keyboard/reorder.js";
import { createTreeStore, folderKeyOf } from "../../src/admin/store.js";
import type { TreeStore } from "../../src/admin/store.js";
import type { TreeItem } from "../../src/types.js";
import { pageRow } from "../helpers/treeItems.js";

const folderId = 10;

const titlesOf = (store: TreeStore): string[] =>
  (store.getState().childrenByFolder[folderKeyOf(folderId)]?.items ?? []).map((item) => item.title);

const openFolder = async (pages: TreeItem[], hasMore = false): Promise<TreeStore> => {
  const store = createTreeStore({
    baseUrl: "/api",
    fetchImplementation: (async () =>
      Response.json({
        hasMore,
        items: pages,
        nextCursor: hasMore ? "next" : null,
        revision: 1,
      })) as unknown as typeof fetch,
    locale: "en",
    pageSize: 100,
  });
  await store.loadChildren(folderId);

  return store;
};

const pages = [
  pageRow(1, "One", folderId),
  pageRow(2, "Two", folderId),
  pageRow(3, "Three", folderId),
  pageRow(4, "Four", folderId),
];

describe("the debounced keyboard reorder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows each press at once and sends one move after the last", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });
    const [first] = pages as [TreeItem];

    expect(reorder.press(first, "down")).toEqual({ position: 2, total: 4, type: "moved" });
    expect(reorder.press(first, "down")).toEqual({ position: 3, total: 4, type: "moved" });
    expect(reorder.press(first, "down")).toEqual({ position: 4, total: 4, type: "moved" });
    expect(titlesOf(store)).toEqual(["Two", "Three", "Four", "One"]);

    // Nothing is sent while presses keep coming.
    await vi.advanceTimersByTimeAsync(reorderDelayMs - 1);
    expect(commits).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);

    expect(commits).toHaveLength(1);
    // One move: after the row that is above it now, naming the row as the editor first saw it.
    expect(commits[0]?.target).toEqual({
      after: { collection: "pages", id: 4 },
      toFolder: folderId,
    });
    expect(commits[0]?.item).toMatchObject({ id: 1, orderKey: "p1" });
  });

  it("waits again after every press", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });
    const [first] = pages as [TreeItem];

    reorder.press(first, "down");
    await vi.advanceTimersByTimeAsync(reorderDelayMs - 100);
    reorder.press(first, "down");
    await vi.advanceTimersByTimeAsync(reorderDelayMs - 100);

    expect(commits).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(commits).toHaveLength(1);
  });

  it("puts the rows back right before the real move is applied", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });
    const [first] = pages as [TreeItem];
    reorder.press(first, "down");
    reorder.press(first, "down");
    await vi.advanceTimersByTimeAsync(reorderDelayMs);

    // The rows are still where the presses put them until the move flow says it is applying.
    expect(titlesOf(store)).toEqual(["Two", "Three", "One", "Four"]);
    commits[0]?.onBeforeApply();
    expect(titlesOf(store)).toEqual(["One", "Two", "Three", "Four"]);
    // And a second call, from an abandoned move, changes nothing.
    commits[0]?.onAbandon();
    expect(titlesOf(store)).toEqual(["One", "Two", "Three", "Four"]);
  });

  it("puts the rows back when the move is abandoned", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });
    const third = pages[2] as TreeItem;
    reorder.press(third, "up");
    await vi.advanceTimersByTimeAsync(reorderDelayMs);

    expect(titlesOf(store)).toEqual(["One", "Three", "Two", "Four"]);
    commits[0]?.onAbandon();
    expect(titlesOf(store)).toEqual(["One", "Two", "Three", "Four"]);
  });

  it("sends nothing when the presses cancel out", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });
    const second = pages[1] as TreeItem;

    reorder.press(second, "down");
    reorder.press(second, "up");
    await vi.advanceTimersByTimeAsync(reorderDelayMs);

    expect(commits).toHaveLength(0);
    expect(titlesOf(store)).toEqual(["One", "Two", "Three", "Four"]);
  });

  it("moves to the top of the folder with a request that names no row", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });
    const second = pages[1] as TreeItem;

    reorder.press(second, "up");
    await vi.advanceTimersByTimeAsync(reorderDelayMs);

    expect(commits[0]?.target).toEqual({ position: "start", toFolder: folderId });
  });

  it("refuses a press at either end, and sends nothing for it", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });

    expect(reorder.press(pages[0] as TreeItem, "up")).toEqual({
      blocked: "first",
      type: "blocked",
    });
    expect(reorder.press(pages[3] as TreeItem, "down")).toEqual({
      blocked: "last",
      type: "blocked",
    });
    expect(reorder.hasPending()).toBe(false);
    await vi.advanceTimersByTimeAsync(reorderDelayMs);
    expect(commits).toHaveLength(0);
  });

  it("does not move a row down when rows after the last loaded one are still to come", async () => {
    const store = await openFolder(pages, true);
    const reorder = createReorderController({ commit: () => undefined, store });

    expect(reorder.press(pages[3] as TreeItem, "down")).toEqual({
      blocked: "unloaded",
      type: "blocked",
    });
  });

  it("sends the waiting presses when another row is pressed, and moves nothing for that press", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });

    reorder.press(pages[0] as TreeItem, "down");
    expect(reorder.press(pages[2] as TreeItem, "up")).toEqual({ type: "flushed" });

    expect(commits).toHaveLength(1);
    expect(titlesOf(store)).toEqual(["Two", "One", "Three", "Four"]);
    expect(reorder.hasPending()).toBe(false);
  });

  it("puts the rows back when it is cancelled", async () => {
    const store = await openFolder(pages);
    const commits: ReorderCommit[] = [];
    const reorder = createReorderController({ commit: (request) => commits.push(request), store });

    reorder.press(pages[0] as TreeItem, "down");
    reorder.cancel();
    await vi.advanceTimersByTimeAsync(reorderDelayMs);

    expect(titlesOf(store)).toEqual(["One", "Two", "Three", "Four"]);
    expect(commits).toHaveLength(0);
  });
});
