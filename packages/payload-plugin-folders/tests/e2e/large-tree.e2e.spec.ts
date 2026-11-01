import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { addDraftPages } from "./helpers/bulk.js";
import { childrenOf, createFolder, deleteFolderWithContent } from "./helpers/content.js";
import { moveOver, startDrag } from "./helpers/drag.js";
import { expandFolder, folderRow, openContentTree, pageRow } from "./helpers/tree.js";

// One folder with 2,000 draft pages, seeded once for the whole file and removed with its content.
// Folders show 100 rows at a time, so the tree has to be asked for the rest ("Load more") before
// it has more rows than a plain list could draw; the tests do that through the page, as an editor
// would. The draft seed writes the pages without the plugin's hooks, which is what makes 2,000 of
// them possible in a test.
test.use({ viewport: { height: 900, width: 1280 } });
test.describe.configure({ mode: "serial" });

const pageTotal = 2000;
const folderName = "Large Folder";
const folderSlug = "large-folder";
let folderId = 0;

test.beforeAll(async ({ baseURL, playwright }) => {
  test.setTimeout(900_000);
  const request = await playwright.request.newContext({ baseURL });
  try {
    folderId = await createFolder(request, { name: folderName, slug: folderSlug });
    await addDraftPages(request, folderId, pageTotal);
  } finally {
    await request.dispose();
  }
});

test.afterAll(async ({ baseURL, playwright }) => {
  test.setTimeout(900_000);
  const request = await playwright.request.newContext({ baseURL });
  try {
    await deleteFolderWithContent(request, { confirmWord: folderSlug, folder: folderId });
    await request.delete("/api/payload-preferences/foldersTree.expanded");
  } finally {
    await request.dispose();
  }
});

const tree = (page: Page): Locator => page.getByTestId("tree");
const gridRows = (page: Page): Locator => tree(page).locator('[role="row"]');
const draftRow = (page: Page, number: number): Locator =>
  pageRow(page, `Draft page ${String(number).padStart(4, "0")}`);

/** The scrolling body of a long tree; it exists only while the tree is drawing part of its rows. */
const scrollBody = (page: Page): Locator => page.locator(".fr-folders-tree__scroll");

const scrollToEnd = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const body = document.querySelector<HTMLElement>(".fr-folders-tree__scroll");
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  });

/** Presses Load more `times` times, going to the end of the list each time, as an editor would. */
const loadMore = async (page: Page, times: number): Promise<void> => {
  for (let index = 0; index < times; index += 1) {
    await scrollToEnd(page);
    const answered = page.waitForResponse(
      (response) =>
        response.url().includes("/folders-tree/children") && response.url().includes("cursor=")
    );
    await page.getByTestId("load-more-row").getByRole("button").click();
    await answered;
  }
};

const openLargeFolder = async (page: Page): Promise<void> => {
  await openContentTree(page);
  await expandFolder(page, folderName);
  await expect(draftRow(page, 1)).toBeVisible();
};

test("expanding the 2,000-page folder renders fewer than 120 row elements", async ({ page }) => {
  test.setTimeout(300_000);
  await openLargeFolder(page);
  // A page of 100 is a short list: every row is in the page.
  await expect(scrollBody(page)).toHaveCount(0);

  await loadMore(page, pageTotal / 100 - 1);
  await expect(page.getByTestId("load-more-row")).toHaveCount(0);

  // Every row is loaded and counted, and the page draws a screenful of them.
  const rowCount = Number(await tree(page).getAttribute("aria-rowcount"));
  expect(rowCount).toBeGreaterThanOrEqual(pageTotal + 1);
  await expect(scrollBody(page)).toHaveCount(1);
  const drawn = await gridRows(page).count();
  expect(drawn).toBeGreaterThan(10);
  expect(drawn).toBeLessThan(120);
  // A row that is drawn says where it is among all of them, and its place among its folder's pages.
  await scrollBody(page).evaluate((body) => {
    body.scrollTop = 0;
  });
  const first = draftRow(page, 1);
  await expect(first).toHaveAttribute("aria-setsize", String(pageTotal));
  await expect(first).toHaveAttribute("aria-posinset", "1");
  await expect(first).toHaveAttribute("aria-rowindex", /^\d+$/u);
});

test("scrolling to the end and Load more work", async ({ page }) => {
  test.setTimeout(120_000);
  await openLargeFolder(page);

  // Three more pages: 400 rows, past the point where the tree starts drawing only some of them.
  await loadMore(page, 3);
  await expect(scrollBody(page)).toHaveCount(1);
  expect(await gridRows(page).count()).toBeLessThan(120);
  await expect(draftRow(page, 400)).toHaveCount(0);

  // The end of the list brings the last rows and the Load more row into the page.
  await scrollToEnd(page);
  await expect(draftRow(page, 400)).toBeVisible();
  await expect(draftRow(page, 1)).toHaveCount(0);
  const button = page.getByTestId("load-more-row").getByRole("button");
  await expect(button).toBeVisible();

  const answered = page.waitForResponse(
    (response) =>
      response.url().includes("/folders-tree/children") && response.url().includes("cursor=")
  );
  await button.click();
  await answered;

  // 100 more rows are below, and the list scrolls on into them.
  await scrollToEnd(page);
  await expect(draftRow(page, 500)).toBeVisible();
  expect(await gridRows(page).count()).toBeLessThan(120);

  // And back to the top.
  await scrollBody(page).evaluate((body) => {
    body.scrollTop = 0;
  });
  await expect(draftRow(page, 1)).toBeVisible();
  await expect(draftRow(page, 500)).toHaveCount(0);
});

test("a drag from the bottom area to the top persists", async ({ page, request }) => {
  test.setTimeout(120_000);
  await openLargeFolder(page);
  await loadMore(page, 3);
  await scrollToEnd(page);
  await expect(draftRow(page, 395)).toBeVisible();

  // Pick a row up near the bottom, and take it up the list with the wheel while it is held.
  await startDrag(page, draftRow(page, 395));
  await expect(page.getByTestId("drag-overlay")).toBeVisible();
  await page.mouse.wheel(0, -100_000);
  await expect(draftRow(page, 3)).toBeVisible();
  // The row that was picked up is far below the view; the overlay still carries it.
  await expect(page.getByTestId("drag-overlay-label")).toHaveText("Draft page 0395");
  await moveOver(page, draftRow(page, 3), "before");
  await expect(page.getByTestId("drop-indicator")).toBeVisible();
  await page.mouse.up();

  // The row is between the second and the third, on screen and in the database.
  const titles = async () =>
    (await childrenOf(request, folderId)).slice(0, 4).map((row) => row.title);
  await expect
    .poll(titles)
    .toEqual(["Draft page 0001", "Draft page 0002", "Draft page 0395", "Draft page 0003"]);
  await openLargeFolder(page);
  await expect(page.locator('[data-testid="tree-row"][data-kind="page"]').nth(2)).toHaveAttribute(
    "data-title",
    "Draft page 0395"
  );
});

test("End on a long tree focuses the last row, which is drawn, and Home the first", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await openLargeFolder(page);
  await loadMore(page, pageTotal / 100 - 1);
  await expect(scrollBody(page)).toHaveCount(1);
  const rows = page.getByTestId("tree-row");

  // Into the tree by the keyboard: the row in the tab order takes the focus. It is drawn although
  // the list was scrolled to the end, and focusing it brings the list back to the top.
  await page.locator('[data-testid="tree-row"][tabindex="0"]').focus();
  await expect.poll(() => scrollBody(page).evaluate((body) => body.scrollTop)).toBe(0);

  // End: the last row of the whole tree, a folder after the 2,000 pages, a long way down. It was
  // not drawn a moment ago; now it is, and it has the focus.
  await page.keyboard.press("End");
  const last = rows.last();
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-level", "1");
  await expect(last).toHaveAttribute(
    "aria-posinset",
    (await last.getAttribute("aria-setsize")) ?? ""
  );
  expect(await gridRows(page).count()).toBeLessThan(120);

  // The last of the pages is drawn now too, and says where it is although 1,999 rows above it are
  // not in the page.
  const lastPage = draftRow(page, pageTotal);
  await expect(lastPage).toHaveAttribute("aria-posinset", String(pageTotal));
  await expect(lastPage).toHaveAttribute("aria-setsize", String(pageTotal));
  await lastPage.focus();
  await page.keyboard.press("ArrowUp");
  await expect(draftRow(page, pageTotal - 1)).toBeFocused();

  // Home goes to the top of the whole tree, a long way up.
  await page.keyboard.press("Home");
  const first = rows.first();
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute("aria-posinset", "1");

  // The row in the tab order stays drawn when the list is scrolled away from it.
  await scrollBody(page).evaluate((body) => {
    body.scrollTop = body.scrollHeight / 2;
  });
  await expect(page.locator('[data-testid="tree-row"][tabindex="0"]')).toHaveCount(1);
  await expect(first).toBeAttached();

  // A tree that draws part of its rows is still a tree to a screen reader: no serious or critical
  // finding in the grid, the rows and the scrolling body.
  const results = await new AxeBuilder({ page })
    .include('[data-testid="tree"]')
    .exclude('[data-testid="create-button"]')
    .analyze();
  expect(
    results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`
      )
  ).toEqual([]);
});

test("the focus stays on its row when the list crosses 300 rows", async ({ page }) => {
  test.setTimeout(120_000);
  await openLargeFolder(page);
  await loadMore(page, 3);
  await expect(scrollBody(page)).toHaveCount(1);
  await scrollBody(page).evaluate((body) => {
    body.scrollTop = 0;
  });
  const folder = folderRow(page, folderName);
  await expect(folder).toBeVisible();

  // Closing the folder takes the list under 300 rows, so it stops drawing only some of them.
  await folder.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(scrollBody(page)).toHaveCount(0);
  await expect(folder).toHaveAttribute("aria-expanded", "false");
  await expect(folder).toBeFocused();

  // Opening it again, and going into it, with the keys alone.
  await page.keyboard.press("ArrowRight");
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(folder).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(draftRow(page, 1)).toBeFocused();
});

test("Load more pressed with Enter moves the focus into the new rows, below and past 300 rows", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openLargeFolder(page);
  const button = page.getByTestId("load-more-row").getByRole("button");
  // The pages by their place among the folder's pages, because earlier tests reorder them.
  const pageAt = (position: number): Locator =>
    page.locator(`[data-testid="tree-row"][data-kind="page"][aria-posinset="${position}"]`);
  const pressLoadMoreFrom = async (lastPosition: number): Promise<void> => {
    await pageAt(lastPosition).focus();
    await button.focus();
    await page.keyboard.press("Enter");
  };

  // 100 rows are loaded, a short list: Enter brings 100 more and the focus lands on the first.
  await pressLoadMoreFrom(100);
  await expect(pageAt(101)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(pageAt(102)).toBeFocused();
  await expect(scrollBody(page)).toHaveCount(0);

  // The next page takes the list past 300 rows with the folders around it, where it draws only
  // some of them: the focus still lands on the first new row.
  await pressLoadMoreFrom(200);
  await expect(scrollBody(page)).toHaveCount(1);
  await expect(pageAt(201)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(pageAt(202)).toBeFocused();
});
