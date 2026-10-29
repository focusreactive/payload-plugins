import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

import {
  childrenOf,
  createFolder,
  createPage,
  deleteFolder,
  deletePage,
} from "./helpers/content.js";
import type { ChildRow } from "./helpers/content.js";
import { dragRowTo, moveOver, rowTitlesIn, startDrag } from "./helpers/drag.js";
import { expandFolder, folderRow, openContentTree, pageRow, rowCheckbox } from "./helpers/tree.js";

// The rows these tests drag are their own, in folders the tests create and remove, so the seeded
// tree that the other specs read is never touched. The one seeded row used is the folder 2026 that
// accepts blog posts only, which is only hovered.
test.use({ viewport: { height: 1100, width: 1280 } });
test.describe.configure({ mode: "serial" });

let labId = 0;
const createdFolders: number[] = [];
const createdPages: number[] = [];

test.beforeAll(async ({ baseURL, playwright }) => {
  const request = await playwright.request.newContext({ baseURL });
  try {
    labId = await createFolder(request, { name: "Drag Lab", slug: "drag-lab" });
  } finally {
    await request.dispose();
  }
});

test.afterEach(async ({ request }) => {
  // Newest first, so a folder is emptied before the folder that holds it.
  for (const folderId of [...createdFolders.splice(0)].toReversed()) {
    for (const row of await childrenOf(request, folderId)) {
      if (row.kind === "page") {
        await deletePage(request, row.id);
      }
    }
    await deleteFolder(request, folderId);
  }
  for (const id of createdPages.splice(0)) {
    await request.delete(`/api/pages/${id}`);
  }
});

test.afterAll(async ({ baseURL, playwright }) => {
  const request = await playwright.request.newContext({ baseURL });
  try {
    for (const row of await childrenOf(request, labId)) {
      if (row.kind === "page") {
        await deletePage(request, row.id);
      }
    }
    await deleteFolder(request, labId);
  } finally {
    await request.dispose();
  }
});

const slugOf = (title: string): string => title.toLowerCase().replaceAll(" ", "-");

const addPage = async (
  request: APIRequestContext,
  title: string,
  folder = labId
): Promise<number> => {
  const id = await createPage(request, { folder, slug: slugOf(title), title });
  createdPages.push(id);

  return id;
};

const addFolder = async (
  request: APIRequestContext,
  name: string,
  parent = labId
): Promise<number> => {
  const id = await createFolder(request, { name, parent, slug: slugOf(name) });
  createdFolders.push(id);

  return id;
};

const openLab = async (page: Page): Promise<void> => {
  await openContentTree(page);
  await expandFolder(page, "Drag Lab");
};

/** Title and full path of each row, as the endpoint the tree reads answers after a reload. */
const titlesAndPaths = (rows: ChildRow[]): string[][] =>
  rows.map((row) => [row.title, row.fullPath]);

const reloadTree = async (page: Page): Promise<void> => {
  await page.reload();
  await page.getByRole("treegrid").waitFor();
};

const confirmDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });

/**
 * The move requests the page sends, with their bodies: a drop that is refused on screen sends
 * none, and a drop after a row names the folder the editor saw that row in.
 */
const countMoveRequests = (page: Page): { bodies: unknown[]; count: () => number } => {
  const bodies: unknown[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/folders-tree/move")) {
      bodies.push(request.postDataJSON());
    }
  });

  return { bodies, count: () => bodies.length };
};

const overlay = (page: Page): Locator => page.getByTestId("drag-overlay");

test("reorder before", async ({ page, request }) => {
  const ids: Record<string, number> = {};
  for (const title of ["Order A", "Order B", "Order C", "Order D"]) {
    ids[title] = await addPage(request, title);
  }
  const moveRequests = countMoveRequests(page);
  expect((await childrenOf(request, labId)).map((row) => row.title)).toEqual([
    "Order D",
    "Order C",
    "Order B",
    "Order A",
  ]);
  await openLab(page);

  // The top half of Order C is the gap between D and C: after D, in the middle of the list.
  await startDrag(page, pageRow(page, "Order A"));
  await moveOver(page, pageRow(page, "Order C"), "before");
  const line = page.getByTestId("drop-indicator");
  await expect(line).toHaveAttribute("data-edge", "top");
  await expect(pageRow(page, "Order C")).toContainText("Order C");
  await expect(pageRow(page, "Order C").getByTestId("drop-indicator")).toHaveCount(1);
  await page.mouse.up();
  await expect(page.getByText("Moved 1 item")).toBeVisible();
  // The gap is named by the row above it, with the folder the editor saw that row in.
  expect(moveRequests.bodies).toMatchObject([
    {
      after: { collection: "pages", expected: { parentId: labId }, id: ids["Order D"] },
      items: [{ collection: "pages", id: ids["Order A"] }],
    },
  ]);

  await reloadTree(page);
  expect(titlesAndPaths(await childrenOf(request, labId))).toEqual([
    ["Order D", "/drag-lab/order-d"],
    ["Order A", "/drag-lab/order-a"],
    ["Order C", "/drag-lab/order-c"],
    ["Order B", "/drag-lab/order-b"],
  ]);
});

test("reorder after", async ({ page, request }) => {
  const ids: Record<string, number> = {};
  for (const title of ["Order A", "Order B", "Order C", "Order D"]) {
    ids[title] = await addPage(request, title);
  }
  const moveRequests = countMoveRequests(page);
  await openLab(page);

  // The bottom half of Order B is the gap right after it.
  await startDrag(page, pageRow(page, "Order D"));
  await moveOver(page, pageRow(page, "Order B"), "after");
  await expect(pageRow(page, "Order B").getByTestId("drop-indicator")).toHaveAttribute(
    "data-edge",
    "bottom"
  );
  await page.mouse.up();
  await expect(page.getByText("Moved 1 item")).toBeVisible();
  expect(moveRequests.bodies).toMatchObject([
    {
      after: { collection: "pages", expected: { parentId: labId }, id: ids["Order B"] },
      items: [{ collection: "pages", id: ids["Order D"] }],
    },
  ]);

  await reloadTree(page);
  expect(titlesAndPaths(await childrenOf(request, labId))).toEqual([
    ["Order C", "/drag-lab/order-c"],
    ["Order B", "/drag-lab/order-b"],
    ["Order D", "/drag-lab/order-d"],
    ["Order A", "/drag-lab/order-a"],
  ]);
});

test("drop inside a collapsed folder after auto-expand", async ({ page, request }) => {
  const innerId = await addFolder(request, "Drag Inner");
  await addPage(request, "Inner Existing", innerId);
  await addPage(request, "Auto Probe");
  await openLab(page);
  const inner = folderRow(page, "Drag Inner");
  await expect(inner).toHaveAttribute("aria-expanded", "false");

  await startDrag(page, pageRow(page, "Auto Probe"));
  await moveOver(page, inner, "inside");
  await expect(inner).toHaveAttribute("data-drop", "inside");
  // Hovered for 600 ms, the folder opens and shows what is in it.
  await expect(inner).toHaveAttribute("aria-expanded", "true");
  await expect(pageRow(page, "Inner Existing")).toBeVisible();
  await page.mouse.up();

  const confirm = confirmDialog(page);
  await expect(confirm.getByTestId("url-change-summary")).toContainText(
    "1 published URL will change"
  );
  await confirm.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 1 item")).toBeVisible();

  await reloadTree(page);
  // Inside is the top of the folder.
  expect(titlesAndPaths(await childrenOf(request, innerId))).toEqual([
    ["Auto Probe", "/drag-lab/drag-inner/auto-probe"],
    ["Inner Existing", "/drag-lab/drag-inner/inner-existing"],
  ]);
});

test("move a folder with children and confirm the URL count", async ({ page, request }) => {
  const moverId = await addFolder(request, "Drag Mover");
  await addPage(request, "Mover One", moverId);
  await addPage(request, "Mover Two", moverId);
  const destinationId = await addFolder(request, "Drag Destination");
  await openLab(page);

  await dragRowTo(
    page,
    folderRow(page, "Drag Mover"),
    folderRow(page, "Drag Destination"),
    "inside"
  );

  // Two published pages under the folder: two URLs, in two languages through the fallback.
  const confirm = confirmDialog(page);
  await expect(confirm.getByTestId("url-change-summary")).toHaveText(
    "2 published URLs will change (4 across 2 languages)."
  );
  await expect(confirm.getByTestId("url-samples")).toContainText(
    "/drag-lab/drag-mover/mover-one becomes /drag-lab/drag-destination/drag-mover/mover-one"
  );
  expect(await childrenOf(request, destinationId)).toEqual([]);
  await confirm.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 1 item")).toBeVisible();

  await reloadTree(page);
  expect(titlesAndPaths(await childrenOf(request, destinationId))).toEqual([
    ["Drag Mover", "/drag-lab/drag-destination/drag-mover"],
  ]);
  expect(titlesAndPaths(await childrenOf(request, moverId))).toEqual([
    ["Mover Two", "/drag-lab/drag-destination/drag-mover/mover-two"],
    ["Mover One", "/drag-lab/drag-destination/drag-mover/mover-one"],
  ]);
});

test("a three-item drag keeps their order", async ({ page, request }) => {
  for (const title of ["Triple One", "Triple Two", "Triple Three"]) {
    await addPage(request, title);
  }
  const destinationId = await addFolder(request, "Drag Triple Destination");
  await openLab(page);
  // On screen: Three, Two, One. The order the editor sees is the order that must be kept.
  const onScreen = ["Triple Three", "Triple Two", "Triple One"];
  for (const title of onScreen) {
    await rowCheckbox(page, title).check();
  }

  // Dragging a ticked row takes the whole selection, whichever of the three it is.
  await startDrag(page, pageRow(page, "Triple Two"));
  await expect(overlay(page)).toHaveText("3 items");
  await expect(page.locator('[data-testid="tree-row"][data-dragged="true"]')).toHaveCount(3);
  await moveOver(page, folderRow(page, "Drag Triple Destination"), "inside");
  await page.mouse.up();

  const confirm = confirmDialog(page);
  await expect(confirm.getByTestId("url-change-summary")).toContainText(
    "3 published URLs will change"
  );
  await confirm.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 3 items")).toBeVisible();

  await reloadTree(page);
  expect(titlesAndPaths(await childrenOf(request, destinationId))).toEqual(
    onScreen.map((title) => [title, `/drag-lab/drag-triple-destination/${slugOf(title)}`])
  );
});

test("a folder into its own child shows not allowed and changes nothing", async ({
  page,
  request,
}) => {
  const parentId = await addFolder(request, "Drag Parent");
  const childId = await addFolder(request, "Drag Child", parentId);
  await addPage(request, "Child Page", childId);
  const moveRequests = countMoveRequests(page);
  await openLab(page);
  await expandFolder(page, "Drag Parent");
  await expect(folderRow(page, "Drag Child")).toBeVisible();

  await startDrag(page, folderRow(page, "Drag Parent"));
  await moveOver(page, folderRow(page, "Drag Child"), "inside");

  const reason = "A folder cannot be moved into itself or one of its subfolders";
  await expect(overlay(page)).toHaveAttribute("data-refused", "true");
  await expect(page.getByTestId("drop-reason")).toHaveText(reason);
  // The pointer shows the not-allowed cursor over the row it is on.
  await expect(folderRow(page, "Drag Child")).toHaveAttribute("data-drop", "inside");
  expect(await folderRow(page, "Drag Child").evaluate((row) => getComputedStyle(row).cursor)).toBe(
    "not-allowed"
  );
  await page.mouse.up();

  await expect(overlay(page)).toHaveCount(0);
  await expect(confirmDialog(page)).toHaveCount(0);
  await expect(page.getByText(/^Moved /u)).toHaveCount(0);
  expect(moveRequests.count()).toBe(0);
  await reloadTree(page);
  expect(titlesAndPaths(await childrenOf(request, parentId))).toEqual([
    ["Drag Child", "/drag-lab/drag-parent/drag-child"],
  ]);
  expect(titlesAndPaths(await childrenOf(request, childId))).toEqual([
    ["Child Page", "/drag-lab/drag-parent/drag-child/child-page"],
  ]);
});

test("a Page into the Article-only folder is refused", async ({ page, request }) => {
  await addPage(request, "Refused Probe");
  const moveRequests = countMoveRequests(page);
  await openContentTree(page);
  await expandFolder(page, "Drag Lab");
  await expandFolder(page, "Blog");
  const articleOnly = folderRow(page, "2026");
  await expect(articleOnly).toBeVisible();

  await startDrag(page, pageRow(page, "Refused Probe"));
  await moveOver(page, articleOnly, "inside");

  await expect(overlay(page)).toHaveAttribute("data-refused", "true");
  await expect(page.getByTestId("drop-reason")).toHaveText(
    "/blog/2026 accepts only Blog post pages"
  );
  await page.mouse.up();

  await expect(confirmDialog(page)).toHaveCount(0);
  expect(moveRequests.count()).toBe(0);
  await reloadTree(page);
  expect(titlesAndPaths(await childrenOf(request, labId))).toEqual([
    ["Refused Probe", "/drag-lab/refused-probe"],
  ]);
});

test("Escape cancels", async ({ page, request }) => {
  await addPage(request, "Escape Probe");
  const destinationId = await addFolder(request, "Drag Escape Destination");
  const moveRequests = countMoveRequests(page);
  await openLab(page);

  await startDrag(page, pageRow(page, "Escape Probe"));
  await moveOver(page, folderRow(page, "Drag Escape Destination"), "inside");
  await expect(overlay(page)).toBeVisible();
  await expect(folderRow(page, "Drag Escape Destination")).toHaveAttribute("data-drop", "inside");

  await page.keyboard.press("Escape");
  await expect(overlay(page)).toHaveCount(0);
  await expect(page.locator("[data-drop]")).toHaveCount(0);
  // Letting go afterwards drops nothing.
  await page.mouse.up();

  await expect(confirmDialog(page)).toHaveCount(0);
  expect(moveRequests.count()).toBe(0);
  await reloadTree(page);
  expect(titlesAndPaths(await childrenOf(request, labId)).map(([title]) => title)).toEqual([
    "Drag Escape Destination",
    "Escape Probe",
  ]);
  expect(await childrenOf(request, destinationId)).toEqual([]);
});

test("no drag starts while a move is in flight", async ({ page, request }) => {
  await addPage(request, "Busy A");
  await addPage(request, "Busy B");
  await addPage(request, "Busy C");
  await page.route("**/api/folders-tree/revision", (route) => route.abort());
  let settleGate!: () => void;
  const gate = new Promise<void>((resolve) => {
    settleGate = resolve;
  });
  await page.route("**/api/folders-tree/move", async (route) => {
    await gate;
    await route.continue();
  });
  await openLab(page);

  await dragRowTo(page, pageRow(page, "Busy A"), pageRow(page, "Busy C"), "before");
  // The reorder asks nothing, and its request waits at the gate: the move is in flight.
  await startDrag(page, pageRow(page, "Busy B"));
  await expect(overlay(page)).toHaveCount(0);
  await page.mouse.up();

  settleGate();
  await expect(page.getByText("Moved 1 item")).toBeVisible();
  expect((await childrenOf(request, labId)).map((row) => row.title)).toEqual([
    "Busy A",
    "Busy C",
    "Busy B",
  ]);
});

test("a refused drop moves the row at once, then puts it back and offers Reload", async ({
  page,
  request,
}) => {
  await addPage(request, "Stale A");
  await addPage(request, "Stale B");
  await page.route("**/api/folders-tree/revision", (route) => route.abort());
  let refuse!: () => void;
  const gate = new Promise<void>((resolve) => {
    refuse = resolve;
  });
  await page.route("**/api/folders-tree/move", async (route) => {
    await gate;
    await route.fulfill({
      body: JSON.stringify({
        errors: [
          {
            data: { reason: "stale" },
            message: "This part of the tree changed. Reload and try again.",
          },
        ],
      }),
      contentType: "application/json",
      status: 409,
    });
  });
  await openLab(page);
  await expect(pageRow(page, "Stale B")).toBeVisible();
  const staleTitles = ["Stale A", "Stale B"];
  expect(await rowTitlesIn(page, staleTitles)).toEqual(["Stale B", "Stale A"]);

  await dragRowTo(page, pageRow(page, "Stale A"), pageRow(page, "Stale B"), "before");

  // The server has not answered, and the tree already shows the new order.
  await expect.poll(() => rowTitlesIn(page, staleTitles)).toEqual(["Stale A", "Stale B"]);
  refuse();

  await expect(
    page.getByText("This part of the tree changed. Reload and try again.")
  ).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Reload" })).toBeVisible();
  await expect.poll(() => rowTitlesIn(page, staleTitles)).toEqual(["Stale B", "Stale A"]);
  expect((await childrenOf(request, labId)).map((row) => row.title)).toEqual([
    "Stale B",
    "Stale A",
  ]);
});

test("the list scrolls while a row is held near the bottom edge", async ({ page }) => {
  const moveRequests = countMoveRequests(page);
  await openContentTree(page);
  // The seeded archive is a long list; the drag is cancelled, so none of it is touched.
  await expandFolder(page, "Archive");
  const entries = page.locator('[data-kind="page"][data-title^="Archive entry"]');
  await expect(entries.first()).toBeVisible();
  const scrolled = () => page.evaluate(() => document.scrollingElement?.scrollTop ?? 0);
  expect(await scrolled()).toBe(0);

  await startDrag(page, entries.first());
  const height = page.viewportSize()?.height ?? 0;
  await page.mouse.move(640, height - 20, { steps: 10 });

  await expect.poll(scrolled).toBeGreaterThan(200);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(moveRequests.count()).toBe(0);
});
