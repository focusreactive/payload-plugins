import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

import { childrenOf, createFolder, createPage, removeFolderTree } from "./helpers/content.js";
import { moveOver, startDrag } from "./helpers/drag.js";
import {
  expandFolder,
  folderRow,
  openContentTree,
  openZoomedTree,
  pageRow,
} from "./helpers/tree.js";

// Each test builds its own folders, so the seeded tree the other specs read is never changed.
test.use({ viewport: { height: 1000, width: 1280 } });

const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  // Newest first, each with whatever a test moved into it.
  for (const id of createdFolders.splice(0).toReversed()) {
    if ((await request.get(`/api/folders/${id}?depth=0`)).ok()) {
      await removeFolderTree(request, id);
    }
  }
  await request.delete("/api/payload-preferences/foldersTree.expanded");
});

const slugOf = (title: string): string => title.toLowerCase().replaceAll(" ", "-");

const addFolder = async (
  request: APIRequestContext,
  name: string,
  parent?: number
): Promise<number> => {
  const id = await createFolder(request, {
    name,
    ...(parent === undefined ? {} : { parent }),
    slug: slugOf(name),
  });
  createdFolders.push(id);

  return id;
};

const addPage = (
  request: APIRequestContext,
  title: string,
  folder: number,
  status: "draft" | "published" = "draft"
): Promise<number> => createPage(request, { folder, slug: slugOf(title), status, title });

const titlesIn = async (request: APIRequestContext, folder: number): Promise<string[]> =>
  (await childrenOf(request, folder)).map((child) => child.title);

/** The titles of the rows on screen, top to bottom. */
const screenTitles = (page: Page): Promise<(string | null)[]> =>
  page
    .getByTestId("tree")
    .getByTestId("tree-row")
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-title")));

const confirmDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });

const confirmMove = async (page: Page): Promise<void> => {
  await confirmDialog(page).getByRole("button", { exact: true, name: "Move" }).click();
  await expect(confirmDialog(page)).toHaveCount(0);
};

/** A move or its preview, the two requests a keyboard move may send. */
const watchMoves = (page: Page): { moves: () => number; previews: () => number } => {
  let moves = 0;
  let previews = 0;
  page.on("request", (request) => {
    if (request.method() !== "POST") {
      return;
    }
    const { pathname } = new URL(request.url());
    if (pathname.endsWith("/folders-tree/move")) {
      moves += 1;
    } else if (pathname.endsWith("/folders-tree/move/preview")) {
      previews += 1;
    }
  });

  return { moves: () => moves, previews: () => previews };
};

test("arrows, Home and End move focus", async ({ page }) => {
  await openContentTree(page);
  await expandFolder(page, "Blog");
  const rows = page.getByTestId("tree").getByTestId("tree-row");
  await expect(pageRow(page, "Hello World")).toBeVisible();
  const titles = await screenTitles(page);

  // One row is in the tab order: the one that last had the focus, here Blog, whose chevron was
  // clicked. The controls inside the other rows are not stops: Tab does not walk through them.
  await expect(page.locator('[data-testid="tree-row"][tabindex="0"]')).toHaveCount(1);
  await expect(folderRow(page, "Blog")).toHaveAttribute("tabindex", "0");
  await expect(rows.first()).toHaveAttribute("tabindex", "-1");
  await expect(rows.first().getByRole("checkbox")).toHaveAttribute("tabindex", "-1");

  await rows.first().focus();
  await expect(rows.first()).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("ArrowDown");
  await expect(rows.nth(1)).toBeFocused();
  // The row with the focus is the one in the tab order now.
  await expect(rows.nth(1)).toHaveAttribute("tabindex", "0");
  await expect(rows.first()).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowUp");
  await expect(rows.first()).toBeFocused();
  // Up at the top stays at the top.
  await page.keyboard.press("ArrowUp");
  await expect(rows.first()).toBeFocused();

  await page.keyboard.press("End");
  await expect(rows.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(rows.first()).toBeFocused();

  // Right and Left: on the open Blog, Right goes in, Left goes out, and Left again closes it.
  await folderRow(page, "Blog").focus();
  await page.keyboard.press("ArrowRight");
  await expect(rows.nth(titles.indexOf("Blog") + 1)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(folderRow(page, "Blog")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(folderRow(page, "Blog")).toHaveAttribute("aria-expanded", "false");
  await expect(pageRow(page, "Hello World")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(folderRow(page, "Blog")).toHaveAttribute("aria-expanded", "true");

  // Every row says where it is in its folder.
  const blog = folderRow(page, "Blog");
  await expect(blog).toHaveAttribute("aria-level", "1");
  await expect(blog).toHaveAttribute("aria-posinset", String(1 + titles.indexOf("Blog")));
  await expect(pageRow(page, "Hello World")).toHaveAttribute("aria-level", "2");
  const setSize = Number(await pageRow(page, "Hello World").getAttribute("aria-setsize"));
  expect(setSize).toBeGreaterThan(3);
});

test("three Alt+Down presses commit one move", async ({ page, request }) => {
  const folder = await addFolder(request, "Kb order");
  // The newest row is on top, so they are created from the bottom up.
  for (const title of ["Kb E", "Kb D", "Kb C", "Kb B", "Kb A"]) {
    await addPage(request, title, folder);
  }
  await openZoomedTree(page, folder);
  const requests = watchMoves(page);
  await expect(pageRow(page, "Kb E")).toBeVisible();

  await pageRow(page, "Kb A").focus();
  await page.keyboard.press("Alt+ArrowDown");
  await page.keyboard.press("Alt+ArrowDown");
  await page.keyboard.press("Alt+ArrowDown");

  // At once the row is three places down on screen, and still has the focus.
  expect(await screenTitles(page)).toEqual(["Kb B", "Kb C", "Kb D", "Kb A", "Kb E"]);
  await expect(pageRow(page, "Kb A")).toBeFocused();
  expect(requests.previews()).toBe(0);
  expect(await titlesIn(request, folder)).toEqual(["Kb A", "Kb B", "Kb C", "Kb D", "Kb E"]);

  // After the last press the editor stops, and one move is sent.
  await expect(page.getByText("Moved 1 item")).toBeVisible();
  expect(await titlesIn(request, folder)).toEqual(["Kb B", "Kb C", "Kb D", "Kb A", "Kb E"]);
  expect(requests.moves()).toBe(1);
  expect(await screenTitles(page)).toEqual(["Kb B", "Kb C", "Kb D", "Kb A", "Kb E"]);
  await expect(pageRow(page, "Kb A")).toBeFocused();

  // Cmd/Ctrl+Z undoes it while the toast is up.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByText("Moved 1 item back")).toBeVisible();
  expect(await titlesIn(request, folder)).toEqual(["Kb A", "Kb B", "Kb C", "Kb D", "Kb E"]);
});

test("Alt+Up and Alt+Down at the ends move nothing", async ({ page, request }) => {
  const folder = await addFolder(request, "Kb ends");
  for (const title of ["Kb last", "Kb first"]) {
    await addPage(request, title, folder);
  }
  await openZoomedTree(page, folder);
  const requests = watchMoves(page);

  await pageRow(page, "Kb first").focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(page.getByTestId("live-region")).toHaveText(
    "Kb first is already first in its folder"
  );
  await pageRow(page, "Kb last").focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(page.getByTestId("live-region")).toHaveText("Kb last is already last in its folder");

  await page.waitForTimeout(1200);
  expect(requests.moves()).toBe(0);
  expect(await screenTitles(page)).toEqual(["Kb first", "Kb last"]);
});

test("a refused keyboard move puts the rows back when its dialog is dismissed", async ({
  page,
  request,
}) => {
  const folder = await addFolder(request, "Kb refused");
  const elsewhere = await addFolder(request, "Kb elsewhere");
  await addPage(request, "Kb three", folder);
  const second = await addPage(request, "Kb two", folder);
  const first = await addPage(request, "Kb one", folder);
  await openZoomedTree(page, folder);
  await expect(pageRow(page, "Kb three")).toBeVisible();
  const requests = watchMoves(page);

  // Someone else moves the row the press will land after, so the editor's view is out of date.
  const moved = await request.post("/api/folders-tree/move", {
    data: { items: [{ collection: "pages", id: second }], position: "start", toFolder: elsewhere },
  });
  expect(moved.ok()).toBe(true);
  await pageRow(page, "Kb one").focus();
  await page.keyboard.press("Alt+ArrowDown");
  expect(await screenTitles(page)).toEqual(["Kb two", "Kb one", "Kb three"]);

  // The move is refused as out of date, and says so in the dialog.
  await expect(confirmDialog(page)).toBeVisible();
  await expect(page.getByTestId("blocked-list")).toBeVisible();
  await confirmDialog(page).getByRole("button", { exact: true, name: "Cancel" }).click();

  // Dismissed: the rows the press moved are back where they were, and nothing was moved.
  await expect(confirmDialog(page)).toHaveCount(0);
  expect(await screenTitles(page)).toEqual(["Kb one", "Kb two", "Kb three"]);
  expect(requests.moves()).toBe(0);
  expect((await childrenOf(request, folder)).map((child) => child.id)).toContain(first);
  await expect(pageRow(page, "Kb one")).toBeFocused();
});

test("Alt+Left moves a page out of its folder after the folder", async ({ page, request }) => {
  const outer = await addFolder(request, "Kb outer");
  await addPage(request, "Kb sibling", outer);
  const inner = await addFolder(request, "Kb inner", outer);
  await addPage(request, "Kb page", inner, "published");
  await openZoomedTree(page, outer);
  await expandFolder(page, "Kb inner");
  await expect(pageRow(page, "Kb page")).toBeVisible();
  const requests = watchMoves(page);

  await pageRow(page, "Kb page").focus();
  await page.keyboard.press("Alt+ArrowLeft");

  // The page's URL changes, so the same confirmation as a drop asks first.
  await expect(confirmDialog(page)).toBeVisible();
  await confirmMove(page);

  await expect(page.getByText("Moved 1 item")).toBeVisible();
  // Directly after the folder it left, before the folder's next sibling.
  expect(await titlesIn(request, outer)).toEqual(["Kb inner", "Kb page", "Kb sibling"]);
  expect(await titlesIn(request, inner)).toEqual([]);
  expect(requests.moves()).toBe(1);
  await expect(pageRow(page, "Kb page")).toHaveAttribute("aria-level", "1");
  await expect(pageRow(page, "Kb page")).toBeFocused();
});

test("Alt+Right moves a page into the folder above", async ({ page, request }) => {
  const outer = await addFolder(request, "Kb host");
  await addPage(request, "Kb mover", outer);
  const target = await addFolder(request, "Kb above", outer);
  await addPage(request, "Kb resident", target);
  await openZoomedTree(page, outer);
  await expect(pageRow(page, "Kb mover")).toBeVisible();

  await pageRow(page, "Kb mover").focus();
  await page.keyboard.press("Alt+ArrowRight");

  await expect(page.getByText("Moved 1 item")).toBeVisible();
  // At the top of the folder above it.
  expect(await titlesIn(request, target)).toEqual(["Kb mover", "Kb resident"]);
  expect(await titlesIn(request, outer)).toEqual(["Kb above"]);
  // The folder was opened, so the row is still on screen, one level deeper, and has the keyboard.
  await expect(pageRow(page, "Kb mover")).toHaveAttribute("aria-level", "2");
  await expect(pageRow(page, "Kb mover")).toBeFocused();

  // A row with no folder directly above it has nowhere to go.
  await pageRow(page, "Kb mover").focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(page.getByTestId("live-region")).toHaveText(
    "There is no folder directly above Kb mover to move it into"
  );
});

test("Cmd+X then Cmd+V on a folder moves to its top", async ({ page, request }) => {
  const outer = await addFolder(request, "Kb paste");
  const target = await addFolder(request, "Kb target", outer);
  await addPage(request, "Kb existing", target);
  await addPage(request, "Kb cut", outer);
  await openZoomedTree(page, outer);
  await expect(pageRow(page, "Kb cut")).toBeVisible();

  await pageRow(page, "Kb cut").focus();
  await page.keyboard.press("ControlOrMeta+x");
  await expect(pageRow(page, "Kb cut")).toHaveAttribute("data-cut", "true");
  await expect(page.getByTestId("live-region")).toHaveText(
    "1 item cut. Choose a folder or a page and paste it there"
  );

  await folderRow(page, "Kb target").focus();
  await page.keyboard.press("ControlOrMeta+v");

  await expect(page.getByText("Moved 1 item")).toBeVisible();
  expect(await titlesIn(request, target)).toEqual(["Kb cut", "Kb existing"]);
  expect(await titlesIn(request, outer)).toEqual(["Kb target"]);
  // The cut is spent: pasting again moves nothing.
  await expect(page.locator('[data-cut="true"]')).toHaveCount(0);
});

test("Escape cancels a cut", async ({ page, request }) => {
  const folder = await addFolder(request, "Kb cancel");
  await addPage(request, "Kb keep", folder);
  await openZoomedTree(page, folder);

  await pageRow(page, "Kb keep").focus();
  await page.keyboard.press("ControlOrMeta+x");
  await expect(pageRow(page, "Kb keep")).toHaveAttribute("data-cut", "true");
  await page.keyboard.press("Escape");

  await expect(page.locator('[data-cut="true"]')).toHaveCount(0);
  await expect(page.getByTestId("live-region")).toHaveText("Cut cancelled");
});

test("Shift extends the selection, Cmd+A selects every loaded row and Cmd+D duplicates", async ({
  page,
  request,
}) => {
  const folder = await addFolder(request, "Kb select");
  for (const title of ["Kb s4", "Kb s3", "Kb s2", "Kb s1"]) {
    await addPage(request, title, folder);
  }
  await openZoomedTree(page, folder);
  const selected = page.locator('[data-testid="tree-row"][aria-selected="true"]');
  await expect(pageRow(page, "Kb s4")).toBeVisible();

  await pageRow(page, "Kb s1").focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowDown");
  // The row it started on and the two it passed.
  await expect(selected).toHaveCount(3);
  await expect(pageRow(page, "Kb s3")).toBeFocused();
  await expect(pageRow(page, "Kb s4")).toHaveAttribute("aria-selected", "false");

  await page.keyboard.press("Escape");
  await expect(selected).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+a");
  await expect(selected).toHaveCount(4);

  // Duplicate acts on the ticked rows, and opens the same dialog as the toolbar's button.
  await page.keyboard.press("ControlOrMeta+d");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("M starts Move mode", async ({ page, request }) => {
  const folder = await addFolder(request, "Kb mode");
  await addPage(request, "Kb moving", folder);
  await addPage(request, "Kb other", folder);
  await openZoomedTree(page, folder);

  // Space ticks the focused row, and M moves the ticked rows.
  await pageRow(page, "Kb moving").focus();
  await page.keyboard.press("Space");
  await expect(pageRow(page, "Kb moving")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("m");

  await expect(page.getByTestId("move-mode-bar")).toContainText("Moving 1 item");
  await expect(page.getByTestId("move-marker").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("move-mode-bar")).toHaveCount(0);
  await expect(pageRow(page, "Kb moving")).toBeFocused();
});

test("slash focuses search", async ({ page, request }) => {
  const folder = await addFolder(request, "Kb search");
  await addPage(request, "Kb row", folder);
  await openZoomedTree(page, folder);

  await pageRow(page, "Kb row").focus();
  await page.keyboard.press("/");
  await expect(page.getByTestId("search-input")).toBeFocused();
  // The slash was the shortcut, not text.
  await expect(page.getByTestId("search-input")).toHaveValue("");

  // Typing in the box is the box's own: the tree's keys do not fire, so a slash is a slash.
  await page.keyboard.type("m/ ");
  await expect(page.getByTestId("search-input")).toHaveValue("m/ ");
  await expect(page.getByTestId("move-mode-bar")).toHaveCount(0);
  await expect(page.getByTestId("search-input")).toBeFocused();
});

test("keys do not fire while typing in an input", async ({ page, request }) => {
  const folder = await addFolder(request, "Kb typing");
  await addPage(request, "Kb typed", folder);
  await openZoomedTree(page, folder);

  await pageRow(page, "Kb typed").focus();
  await page.keyboard.press("Space");
  await expect(pageRow(page, "Kb typed")).toHaveAttribute("aria-selected", "true");
  const input = page.getByTestId("search-input");
  await input.focus();
  // M would start Move mode, Delete and Backspace would open the delete dialog, Space would untick.
  await page.keyboard.type("m");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Delete");
  await page.keyboard.type(" ");

  await expect(page.getByTestId("move-mode-bar")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(pageRow(page, "Kb typed")).toHaveAttribute("aria-selected", "true");
  await expect(input).toHaveValue(" ");
});

test("Delete opens the delete dialog and the focus comes back to the row", async ({
  page,
  request,
}) => {
  const folder = await addFolder(request, "Kb delete");
  await addPage(request, "Kb gone", folder);
  await addPage(request, "Kb stays", folder);
  await openZoomedTree(page, folder);

  await pageRow(page, "Kb gone").focus();
  await page.keyboard.press("Delete");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The dialog closed: the keyboard is back on the row it came from.
  await expect(pageRow(page, "Kb gone")).toBeFocused();
});

test("a drag is announced with the titles of the rows", async ({ page, request }) => {
  const outer = await addFolder(request, "Kb drag");
  await addPage(request, "Kb dragged", outer);
  await addFolder(request, "Kb drop", outer);
  await openZoomedTree(page, outer);
  // Payload's own drag context has a live region too; the one with the words is the tree's.
  const announced = (text: string): Locator =>
    page.locator('[id^="DndLiveRegion"]').filter({ hasText: text });
  await expect(pageRow(page, "Kb dragged")).toBeVisible();

  await startDrag(page, pageRow(page, "Kb dragged"));
  await expect(announced("Picked up Kb dragged")).toHaveCount(1);
  await moveOver(page, folderRow(page, "Kb drop"), "inside");
  await expect(announced("Release to put Kb dragged inside Kb drop")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(announced("Move cancelled. Kb dragged stays where it was")).toHaveCount(1);
  await page.mouse.up();

  await startDrag(page, pageRow(page, "Kb dragged"));
  await moveOver(page, folderRow(page, "Kb drop"), "inside");
  await page.mouse.up();
  await expect(announced("Dropped Kb dragged inside Kb drop")).toHaveCount(1);
  await expect(page.getByText("Moved 1 item")).toBeVisible();
});

test("axe finds no serious violations", async ({ page, request }) => {
  const folder = await addFolder(request, "Kb axe");
  await addPage(request, "Kb axe page", folder);
  await openContentTree(page);
  await expandFolder(page, "Blog");
  await expect(pageRow(page, "Hello World")).toBeVisible();

  const scan = async (): Promise<string[]> => {
    // Payload's own primary button (white on its brand blue, 3:1) is the one thing left out: its
    // colors are the admin theme's, not the plugin's.
    const results = await new AxeBuilder({ page })
      .include(".fr-folders")
      .exclude('[data-testid="create-button"]')
      .analyze();

    return results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`
      );
  };

  // The tree.
  expect(await scan()).toEqual([]);
  // The tree with a row focused and a search on.
  await page.getByTestId("search-input").fill("blog");
  await expect(pageRow(page, "Blog Home")).toBeVisible();
  expect(await scan()).toEqual([]);
  // The filters, open.
  await page.getByTestId("search-filters-button").click();
  await expect(page.getByTestId("search-filters")).toBeVisible();
  expect(await scan()).toEqual([]);
});
