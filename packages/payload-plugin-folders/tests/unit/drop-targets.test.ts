import { describe, expect, it } from "vitest";

import { draggedItemsOf, resolveDrop } from "../../src/admin/DragAndDrop/dropTargets.js";
import type { DropRules } from "../../src/admin/DragAndDrop/dropTargets.js";
import type { DropZone } from "../../src/admin/DragAndDrop/dropZones.js";
import { buildMoveBody, optimisticMoveOf } from "../../src/admin/Move/moveFlow.js";
import { itemKeyOf, rootKey } from "../../src/admin/store.js";
import type { ChildrenEntry, TreeStoreState } from "../../src/admin/store.js";
import { flattenTree } from "../../src/admin/Tree/useTreeData.js";
import type { TreeItem } from "../../src/types.js";

const access = { delete: true, publish: true, update: true };

type Overrides = Partial<TreeItem>;

const folder = (
  id: number,
  title: string,
  parentId: number | null,
  depth: number,
  overrides: Overrides = {}
): TreeItem => ({
  access,
  ancestorIds: parentId === null ? "/" : `/${parentId}/`,
  childCount: 0,
  collection: "folders",
  depth,
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
  ...overrides,
});

const page = (
  id: number,
  title: string,
  parentId: number | null,
  depth: number,
  overrides: Overrides = {}
): TreeItem => ({
  access,
  ancestorIds: parentId === null ? "/" : `/${parentId}/`,
  collection: "pages",
  depth,
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
  ...overrides,
});

const entryOf = (items: TreeItem[]): ChildrenEntry => ({
  error: null,
  hasMore: false,
  items,
  loadingMore: false,
  nextCursor: null,
  phase: "loaded",
  refreshing: false,
  revision: 1,
  stale: false,
});

const blogId = 1;
const shopId = 2;
const archiveId = 3;
const articlesId = 4;

/**
 * Top level: Blog (open), Shop, Articles (takes posts only), Home. Blog holds Alpha, Beta, Gamma and
 * the folder Archive (closed, with one loaded page in it).
 */
const fixture = (expanded: string[] = [String(blogId)]) => {
  const alpha = page(10, "Alpha", blogId, 2);
  const beta = page(11, "Beta", blogId, 2);
  const gamma = page(12, "Gamma", blogId, 2);
  const archive = folder(archiveId, "Archive", blogId, 2, {
    ancestorIds: `/${blogId}/`,
    childCount: 1,
    fullPath: "/blog/archive",
  });
  const deep = page(13, "Deep", archiveId, 3, { ancestorIds: `/${blogId}/${archiveId}/` });
  const blog = folder(blogId, "Blog", null, 1, { childCount: 4 });
  const shop = folder(shopId, "Shop", null, 1);
  const articles = folder(articlesId, "Articles", null, 1, { allowedTypes: ["posts"] });
  const home = page(100, "Home", null, 1);
  const state: TreeStoreState = {
    childrenByFolder: {
      [archiveId]: entryOf([deep]),
      [blogId]: entryOf([alpha, beta, gamma, archive]),
      [rootKey]: entryOf([blog, shop, articles, home]),
    },
    expanded,
    revision: 1,
  };

  return { alpha, archive, articles, beta, blog, deep, gamma, home, shop, state };
};

const rules: DropRules = {
  enforceAllowedTypes: true,
  maxDepth: 3,
  reservedRootSegments: ["admin", "api"],
  typeLabels: { pages: "Page", posts: "Post" },
};

const drop = (
  state: TreeStoreState,
  dragged: TreeItem[],
  over: TreeItem,
  zone: DropZone,
  overrides: Partial<DropRules> = {}
) =>
  resolveDrop({
    dragged,
    over: { key: itemKeyOf(over), zone },
    rows: flattenTree(state),
    rules: { ...rules, ...overrides },
    state,
  });

describe("gap to request", () => {
  it("maps the gap before a row to after its previous sibling", () => {
    const { alpha, beta, gamma, state } = fixture();
    const resolved = drop(state, [gamma], beta, "before");

    // Gamma is last; dropped before Beta it goes after Alpha.
    expect(resolved?.target).toEqual({
      after: { collection: "pages", id: alpha.id },
      toFolder: blogId,
    });
    expect(resolved?.indicator).toEqual({ edge: "top", level: 1, rowKey: "pages:11" });
  });

  it("maps the gap before the first row to the start of its folder", () => {
    const { alpha, gamma, state } = fixture();
    const resolved = drop(state, [gamma], alpha, "before");

    expect(resolved?.target).toEqual({ position: "start", toFolder: blogId });
  });

  it("maps the gap before the first top-level row to the start of the top level", () => {
    const { blog, home, state } = fixture();
    const resolved = drop(state, [home], blog, "before");

    expect(resolved?.target).toEqual({ position: "start", toFolder: null });
    expect(resolved?.targetFolder).toBeNull();
  });

  it("maps the gap after a row to after that row", () => {
    const { alpha, gamma, state } = fixture();
    const resolved = drop(state, [gamma], alpha, "after");

    expect(resolved?.target).toEqual({
      after: { collection: "pages", id: alpha.id },
      toFolder: blogId,
    });
    expect(resolved?.indicator).toEqual({ edge: "bottom", level: 1, rowKey: "pages:10" });
  });

  it("maps inside a folder to the start of that folder", () => {
    const { archive, gamma, state } = fixture();
    const resolved = drop(state, [gamma], archive, "inside");

    expect(resolved?.target).toEqual({ position: "start", toFolder: archiveId });
    expect(resolved?.targetFolder?.id).toBe(archiveId);
    expect(resolved?.indicator).toEqual({ edge: "inside", level: 1, rowKey: "folders:3" });
  });

  it("treats inside on a page as after it", () => {
    const { alpha, gamma, state } = fixture();

    expect(drop(state, [gamma], alpha, "inside")?.target).toEqual({
      after: { collection: "pages", id: alpha.id },
      toFolder: blogId,
    });
  });

  it("goes after the previous sibling, not the last row open inside it", () => {
    const { archive, home, shop, state } = fixture([String(blogId), String(archiveId)]);
    const resolved = drop(state, [home], shop, "before");

    // Blog is open and so is Archive inside it, yet the gap before Shop is after Blog itself.
    expect(resolved?.target).toEqual({
      after: { collection: "folders", id: blogId },
      toFolder: null,
    });
    expect(archive.id).toBe(archiveId);
  });

  it("draws the line after an open folder under everything open inside it", () => {
    const { blog, home, state } = fixture([String(blogId), String(archiveId)]);
    const resolved = drop(state, [home], blog, "after");

    expect(resolved?.target).toEqual({
      after: { collection: "folders", id: blogId },
      toFolder: null,
    });
    // The last row inside Blog is Deep, three levels down; the line keeps Blog's own indent.
    expect(resolved?.indicator).toEqual({ edge: "bottom", level: 0, rowKey: "pages:13" });
  });

  it("skips a dragged neighbour: the row leaves its place, and the server refuses an after that moves", () => {
    const { alpha, beta, gamma, state } = fixture();

    // Alpha and Beta travel together; before Gamma is after the last one that stays: nothing.
    expect(drop(state, [alpha, beta], gamma, "before")?.target).toEqual({
      position: "start",
      toFolder: blogId,
    });
    // The gap after a dragged row is the gap before it.
    expect(drop(state, [beta], beta, "after")?.target).toEqual({
      after: { collection: "pages", id: alpha.id },
      toFolder: blogId,
    });
  });

  it("answers null for a row that is not in the loaded tree", () => {
    const { gamma, state } = fixture();

    expect(
      resolveDrop({
        dragged: [gamma],
        over: { key: "pages:999", zone: "before" },
        rows: flattenTree(state),
        rules,
        state,
      })
    ).toBeNull();
  });
});

describe("gap to move body", () => {
  it("sends after with the folder the editor saw the sibling in", () => {
    const { alpha, gamma, state } = fixture();
    const resolved = drop(state, [gamma], alpha, "after");
    const target = resolved?.target as NonNullable<typeof resolved>["target"];

    expect(buildMoveBody([gamma], target)).toEqual({
      after: { collection: "pages", expected: { parentId: blogId }, id: alpha.id },
      items: [{ collection: "pages", expected: { orderKey: "p12", parentId: blogId }, id: 12 }],
    });
    expect(optimisticMoveOf([gamma], target)).toEqual({
      after: { collection: "pages", id: alpha.id },
      items: [{ collection: "pages", id: 12 }],
      toFolder: blogId,
    });
  });

  it("sends the folder id null for an after sibling at the top level", () => {
    const { home, shop, state } = fixture();
    const resolved = drop(state, [home], shop, "after");
    const target = resolved?.target as NonNullable<typeof resolved>["target"];

    expect(buildMoveBody([home], target).after?.expected).toEqual({ parentId: null });
  });

  it("sends start and the folder for the first gap, with no after", () => {
    const { alpha, gamma, state } = fixture();
    const resolved = drop(state, [gamma], alpha, "before");
    const target = resolved?.target as NonNullable<typeof resolved>["target"];
    const body = buildMoveBody([gamma], target);

    expect(body).toMatchObject({ position: "start", toFolder: blogId });
    expect(body.after).toBeUndefined();
  });
});

describe("a drop that changes nothing", () => {
  it("is a no-op next to the row's own place", () => {
    const { alpha, beta, state } = fixture();

    expect(drop(state, [beta], alpha, "after")?.isNoOp).toBe(true);
    expect(drop(state, [beta], beta, "before")?.isNoOp).toBe(true);
    expect(drop(state, [alpha], alpha, "before")?.isNoOp).toBe(true);
  });

  it("is a no-op for the whole group in its own order", () => {
    const { alpha, beta, gamma, state } = fixture();

    expect(drop(state, [alpha, beta], gamma, "before")?.isNoOp).toBe(true);
  });

  it("is not a no-op when the order changes or the folder does", () => {
    const { alpha, archive, beta, gamma, state } = fixture();

    expect(drop(state, [gamma], alpha, "before")?.isNoOp).toBe(false);
    expect(drop(state, [alpha], beta, "after")?.isNoOp).toBe(false);
    expect(drop(state, [alpha], archive, "inside")?.isNoOp).toBe(false);
  });
});

describe("the dragged set", () => {
  it("is the whole selection when the grabbed row is ticked, nested rows left out", () => {
    const { alpha, archive, beta, blog, deep, state } = fixture([
      String(blogId),
      String(archiveId),
    ]);
    const selected = flattenTree(state)
      .flatMap((row) => (row.type === "item" ? [row.item] : []))
      .filter((item) =>
        [alpha, archive, beta, blog, deep].some((other) => itemKeyOf(other) === itemKeyOf(item))
      );

    const carried = draggedItemsOf(alpha, selected);

    expect(carried.isSelection).toBe(true);
    // Blog holds the rest, so it travels alone.
    expect(carried.items.map((item) => item.title)).toEqual(["Blog"]);
  });

  it("keeps the order of the selection", () => {
    const { alpha, beta, gamma } = fixture();
    const carried = draggedItemsOf(gamma, [alpha, beta, gamma]);

    expect(carried.items.map((item) => item.title)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("is the grabbed row alone when it is not ticked, and the ticks stay", () => {
    const { alpha, beta, gamma } = fixture();
    const carried = draggedItemsOf(gamma, [alpha, beta]);

    expect(carried).toEqual({ isSelection: false, items: [gamma] });
  });
});

describe("invalid targets", () => {
  it("refuses a folder into itself", () => {
    const { blog, state } = fixture();

    expect(drop(state, [blog], blog, "inside")?.refusal).toEqual({ kind: "cycle" });
  });

  it("refuses a folder into its own subfolder, in every zone of the rows inside it", () => {
    const { alpha, archive, blog, state } = fixture();

    expect(drop(state, [blog], archive, "inside")?.refusal).toEqual({ kind: "cycle" });
    // The gaps around a row inside Blog are gaps inside Blog.
    expect(drop(state, [blog], alpha, "before")?.refusal).toEqual({ kind: "cycle" });
    expect(drop(state, [blog], alpha, "after")?.refusal).toEqual({ kind: "cycle" });
  });

  it("accepts a folder beside its own siblings and inside another folder", () => {
    const { blog, shop, state } = fixture();

    expect(drop(state, [blog], shop, "inside", { maxDepth: 20 })?.refusal).toBeNull();
    expect(drop(state, [blog], shop, "after")?.refusal).toBeNull();
  });

  it("refuses a page for a folder that takes another type, naming the types", () => {
    const { alpha, articles, state } = fixture();

    expect(drop(state, [alpha], articles, "inside")?.refusal).toEqual({
      kind: "type",
      path: "/articles",
      types: ["Post"],
    });
  });

  it("refuses a folder whose loaded pages the target would not take", () => {
    const { archive, articles, state } = fixture();

    expect(drop(state, [archive], articles, "inside")?.refusal?.kind).toBe("type");
  });

  it("leaves the types to the preview when the plugin only warns", () => {
    const { alpha, articles, state } = fixture();

    expect(
      drop(state, [alpha], articles, "inside", { enforceAllowedTypes: false })?.refusal
    ).toBeNull();
  });

  it("does not refuse a reorder inside a folder that takes another type", () => {
    const article = page(20, "Draft Post", articlesId, 2, { collection: "posts" });
    const second = page(21, "Second Post", articlesId, 2, { collection: "posts" });
    const { articles, state } = fixture();
    const withPosts: TreeStoreState = {
      ...state,
      childrenByFolder: { ...state.childrenByFolder, [articlesId]: entryOf([article, second]) },
      expanded: [String(articlesId)],
    };

    expect(drop(withPosts, [second], article, "before")?.refusal).toBeNull();
    expect(articles.allowedTypes).toEqual(["posts"]);
  });

  it("refuses a page that would pass the depth limit", () => {
    const { alpha, archive, state } = fixture();
    // Archive is two deep, so a page in it is three deep: the limit.
    expect(drop(state, [alpha], archive, "inside")?.refusal).toBeNull();
    expect(drop(state, [alpha], archive, "inside", { maxDepth: 2 })?.refusal).toEqual({
      depth: 3,
      kind: "depth",
      limit: 2,
    });
  });

  it("lets a root page keep its folder's depth, one level less than a page beside it", () => {
    const { alpha, archive, state } = fixture();
    // Archive is two deep: a page in it is three deep, and a root page in it is two.
    const rootPage = { ...alpha, isFolderRoot: true };

    expect(drop(state, [alpha], archive, "inside", { maxDepth: 2 })?.refusal?.kind).toBe("depth");
    expect(drop(state, [rootPage], archive, "inside", { maxDepth: 2 })?.refusal).toBeNull();
  });

  it("refuses a folder whose loaded rows would pass the depth limit", () => {
    const { archive, shop, state } = fixture();
    // Archive (2) with Deep (3) inside moves under Shop (1): Archive 2, Deep 3 stay at the limit...
    expect(drop(state, [archive], shop, "inside", { maxDepth: 3 })?.refusal).toBeNull();
    // ...but under a folder one level down they pass it.
    const nested = folder(30, "Nested", shopId, 2, { ancestorIds: `/${shopId}/` });
    const withNested: TreeStoreState = {
      ...state,
      childrenByFolder: {
        ...state.childrenByFolder,
        [shopId]: entryOf([nested]),
      },
      expanded: [String(blogId), String(shopId)],
    };

    expect(drop(withNested, [archive], nested, "inside", { maxDepth: 3 })?.refusal).toEqual({
      depth: 4,
      kind: "depth",
      limit: 3,
    });
  });

  it("refuses a reserved segment at the top level, whatever its case", () => {
    const { alpha, blog, state } = fixture();
    const reserved = { ...alpha, slug: "Admin" };

    expect(drop(state, [reserved], blog, "before")?.refusal).toEqual({
      dot: false,
      kind: "reserved",
      segment: "Admin",
    });
    // The same row stays fine inside a folder.
    expect(drop(state, [reserved], blog, "inside")?.refusal).toBeNull();
  });

  it("refuses a dotted segment at the top level", () => {
    const { alpha, blog, state } = fixture();

    expect(drop(state, [{ ...alpha, slug: "robots.txt" }], blog, "before")?.refusal).toEqual({
      dot: true,
      kind: "reserved",
      segment: "robots.txt",
    });
  });

  it("refuses a segment a published sibling page already has", () => {
    const { alpha, shop, state } = fixture();
    const sibling = page(40, "Alpha Twin", shopId, 2, {
      ancestorIds: `/${shopId}/`,
      slug: "alpha",
    });
    const withSibling: TreeStoreState = {
      ...state,
      childrenByFolder: { ...state.childrenByFolder, [shopId]: entryOf([sibling]) },
    };

    expect(drop(withSibling, [alpha], shop, "inside")?.refusal).toEqual({
      kind: "conflict",
      otherTitle: "Alpha Twin",
      path: "/shop/alpha",
      title: "Alpha",
    });
  });

  it("does not count a draft sibling or a root page as a conflict", () => {
    const { alpha, shop, state } = fixture();
    const draft = page(40, "Alpha Draft", shopId, 2, {
      ancestorIds: `/${shopId}/`,
      slug: "alpha",
      status: "draft",
    });
    const root = page(41, "Alpha Root", shopId, 1, {
      ancestorIds: `/${shopId}/`,
      isFolderRoot: true,
      slug: "alpha",
    });
    const withSiblings: TreeStoreState = {
      ...state,
      childrenByFolder: { ...state.childrenByFolder, [shopId]: entryOf([draft, root]) },
    };

    expect(drop(withSiblings, [alpha], shop, "inside")?.refusal).toBeNull();
  });

  it("refuses a segment a sibling folder has, and names it as a folder", () => {
    const { alpha, shop, state } = fixture();
    const twin = folder(31, "Alpha", shopId, 2, { ancestorIds: `/${shopId}/` });
    const withTwin: TreeStoreState = {
      ...state,
      childrenByFolder: { ...state.childrenByFolder, [shopId]: entryOf([twin]) },
    };

    expect(drop(withTwin, [alpha], shop, "inside")?.refusal).toMatchObject({
      kind: "conflict",
      otherTitle: null,
    });
  });

  it("refuses two moved rows with the same segment", () => {
    const { alpha, shop, state } = fixture();
    const twin = page(50, "Alpha Copy", archiveId, 3, { slug: "alpha" });

    expect(drop(state, [alpha, twin], shop, "inside")?.refusal).toMatchObject({
      kind: "conflict",
      otherTitle: "Alpha",
    });
  });

  it("checks nothing for rows that stay in their folder", () => {
    const { alpha, beta, state } = fixture();
    const same = { ...alpha, slug: "beta" };

    expect(drop(state, [same], beta, "after")?.refusal).toBeNull();
  });
});
