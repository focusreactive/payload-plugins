import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { childrenOf, createFolder, createPage } from "./helpers/content.js";
import { contextMenu, menuItem, openRowMenu } from "./helpers/menu.js";
import {
  bulkToolbar,
  expandFolder,
  folderRow,
  openContentTree,
  pageRow,
  rowCheckbox,
  toolbarButton,
} from "./helpers/tree.js";

// Each test builds its own folders, so the seeded tree the other specs read is never changed.
const createdFolders: number[] = [];
const createdPages: number[] = [];

test.afterEach(async ({ request }) => {
  for (const id of createdPages.splice(0)) {
    await request.delete(`/api/pages/${id}`);
  }
  for (const id of createdFolders.splice(0)) {
    await request.delete(`/api/folders/${id}`);
  }
});

const addFolder = async (
  request: Parameters<typeof createFolder>[0],
  name: string
): Promise<number> => {
  const id = await createFolder(request, { name, slug: name.toLowerCase().replaceAll(" ", "-") });
  createdFolders.push(id);

  return id;
};

const addPage = async (
  request: Parameters<typeof createPage>[0],
  title: string,
  folder: number
): Promise<number> => {
  const id = await createPage(request, {
    folder,
    slug: title.toLowerCase().replaceAll(" ", "-"),
    title,
  });
  createdPages.push(id);

  return id;
};

const idOfSeedFolder = async (
  request: Parameters<typeof childrenOf>[0],
  title: string,
  parent: number | string = "root"
): Promise<number> => {
  const rows = await childrenOf(request, parent as never);
  const found = rows.find((row) => row.kind === "folder" && row.title === title);
  if (!found) {
    throw new Error(`No folder ${title}`);
  }

  return found.id;
};

const moveModeBar = (page: Page): Locator => page.getByTestId("move-mode-bar");

const marker = (page: Page, key: string): Locator => page.locator(`[data-marker="${key}"]`);

/** The id a tree row carries, for the marker keys that name it. */
const idOf = async (row: Locator): Promise<string> => {
  const id = await row.getAttribute("data-item-id");
  if (id === null) {
    throw new Error("The row has no item id");
  }

  return id;
};

const focusedMarker = (page: Page): Promise<string | null> =>
  page.evaluate(() => document.activeElement?.getAttribute("data-marker") ?? null);

const confirmDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });

test("two items move into the gap after the third row of another folder with no mouse drag", async ({
  page,
  request,
}) => {
  const sourceId = await addFolder(request, "Mode Source");
  const targetId = await addFolder(request, "Mode Target");
  // New pages land on top, so each folder lists its pages in reverse of creation.
  await addPage(request, "Mode Two", sourceId);
  await addPage(request, "Mode One", sourceId);
  await addPage(request, "Target Four", targetId);
  await addPage(request, "Target Three", targetId);
  const targetTwoId = await addPage(request, "Target Two", targetId);
  await addPage(request, "Target One", targetId);
  expect((await childrenOf(request, targetId)).map((row) => row.title)).toEqual([
    "Target One",
    "Target Two",
    "Target Three",
    "Target Four",
  ]);
  const thirdId = (await childrenOf(request, targetId))[2]?.id;

  await openContentTree(page);
  await expandFolder(page, "Mode Source");
  await expandFolder(page, "Mode Target");
  await rowCheckbox(page, "Mode One").check();
  await rowCheckbox(page, "Mode Two").check();

  // The key M starts Move mode for the ticked rows; the bar says what is moving.
  await page.keyboard.press("m");
  await expect(moveModeBar(page)).toHaveText(/Moving 2 items\. Choose where to put them/u);
  await expect(page.getByTestId("bulk-toolbar")).toHaveCount(0);

  // Keyboard only: the markers are focusable, Enter picks the one after the third row.
  const gap = marker(page, `after:pages:${thirdId}`);
  await expect(gap).toHaveText("Move 2 items here");
  await gap.focus();
  await page.keyboard.press("Enter");

  const confirm = confirmDialog(page);
  await expect(confirm.getByTestId("url-samples")).toContainText(
    "/mode-source/mode-one becomes /mode-target/mode-one"
  );
  await confirm.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 2 items")).toBeVisible();
  await expect(moveModeBar(page)).toHaveCount(0);
  await expect(page.getByTestId("bulk-toolbar")).toHaveCount(0);

  await page.reload();
  const inTarget = await childrenOf(request, targetId);
  expect(inTarget.map((row) => [row.title, row.fullPath])).toEqual([
    ["Target One", "/mode-target/target-one"],
    ["Target Two", "/mode-target/target-two"],
    ["Target Three", "/mode-target/target-three"],
    ["Mode One", "/mode-target/mode-one"],
    ["Mode Two", "/mode-target/mode-two"],
    ["Target Four", "/mode-target/target-four"],
  ]);
  expect(await childrenOf(request, sourceId)).toEqual([]);
  expect(targetTwoId).toBeGreaterThan(0);
});

test("markers appear at the top of an expanded folder", async ({ page, request }) => {
  const blogId = await idOfSeedFolder(request, "Blog");
  await openContentTree(page);
  await expandFolder(page, "Blog");
  await rowCheckbox(page, "Home").check();
  await page.keyboard.press("m");

  // The row right under Blog is a marker, the first row of its contents.
  const firstInBlog = folderRow(page, "Blog").locator("xpath=following-sibling::*[1]");
  await expect(firstInBlog).toHaveAttribute("data-testid", "move-marker-row");
  await expect(firstInBlog.getByTestId("move-marker")).toHaveAttribute(
    "data-marker",
    `inside:${blogId}`
  );
  await expect(firstInBlog.getByTestId("move-marker")).toHaveText("Move 1 item here");
  // A closed folder has no marker of its own inside: opening it adds one.
  const productsId = await idOf(folderRow(page, "Products"));
  await expect(marker(page, `inside:${productsId}`)).toHaveCount(0);
  await expandFolder(page, "Products");
  await expect(marker(page, `inside:${productsId}`)).toHaveCount(1);
  await expect(
    folderRow(page, "Products").locator("xpath=following-sibling::*[1]").getByTestId("move-marker")
  ).toHaveAttribute("data-marker", `inside:${productsId}`);
});

// Needs zoom: P-35 (group G17) adds it, and the view has nothing to zoom into until then.
test.fixme("zooming while in Move mode keeps it active", () => {
  // Enter Move mode with a ticked page, zoom into a folder (double click, Alt+Enter or a
  // breadcrumb), and expect the bar and the markers inside the zoomed folder to stay.
});

test("a marker inside the moved folder is disabled", async ({ page, request }) => {
  const blogId = await idOfSeedFolder(request, "Blog");
  await openContentTree(page);
  await expandFolder(page, "Blog");
  await rowCheckbox(page, "Blog").check();
  await toolbarButton(page, "Move").click();
  await expect(moveModeBar(page)).toContainText("Moving 1 item. Choose where to put it");

  const inside = marker(page, `inside:${blogId}`);
  await expect(inside).toHaveAttribute("aria-disabled", "true");
  await inside.hover();
  await expect(page.locator(".tooltip--show")).toHaveText(
    "A folder cannot be moved into itself or one of its subfolders"
  );
  // The gaps in the folder's own contents are refused too, and one outside it is open.
  const blogHome = pageRow(page, "Blog Home");
  await expect(
    blogHome.locator("xpath=following-sibling::*[1]").getByTestId("move-marker")
  ).toHaveAttribute("aria-disabled", "true");
  await expect(
    folderRow(page, "Products").locator("xpath=following-sibling::*[1]").getByTestId("move-marker")
  ).not.toHaveAttribute("aria-disabled", "true");

  // Pressing a refused marker picks nothing: no dialog, still in Move mode.
  // Playwright treats an aria-disabled button as not clickable, so the press is forced.
  await inside.click({ force: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(moveModeBar(page)).toBeVisible();
});

test("a marker in a folder that takes another type is disabled with the folder's types", async ({
  page,
  request,
}) => {
  const yearId = await idOfSeedFolder(request, "2026", await idOfSeedFolder(request, "Blog"));
  await openContentTree(page);
  await expandFolder(page, "Blog");
  await expandFolder(page, "2026");
  await rowCheckbox(page, "Home").check();
  await page.keyboard.press("m");

  const inside = marker(page, `inside:${yearId}`);
  await expect(inside).toHaveAttribute("aria-disabled", "true");
  await inside.hover();
  await expect(page.locator(".tooltip--show")).toHaveText(
    "/blog/2026 accepts only Blog post pages"
  );
});

test("Up and Down walk the markers, and the first one has the focus when Move mode starts", async ({
  page,
}) => {
  await openContentTree(page);
  await rowCheckbox(page, "Home").check();
  await page.keyboard.press("m");

  // Home is first at the top level, so the gaps before it and right after it change nothing and
  // are off; the first open one has the focus.
  await expect.poll(() => focusedMarker(page)).not.toBeNull();
  const start = await focusedMarker(page);
  const all = await page
    .getByTestId("move-marker")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-marker")));
  const startIndex = all.indexOf(start);
  expect(startIndex).toBeGreaterThanOrEqual(0);

  await page.keyboard.press("ArrowDown");
  expect(await focusedMarker(page)).toBe(all[startIndex + 1]);
  await page.keyboard.press("ArrowUp");
  expect(await focusedMarker(page)).toBe(start);
  // At the first marker, Up stays.
  await page.getByTestId("move-marker").first().focus();
  await page.keyboard.press("ArrowUp");
  expect(await focusedMarker(page)).toBe(all[0]);
});

test("Escape leaves Move mode", async ({ page }) => {
  await openContentTree(page);
  await rowCheckbox(page, "Home").check();
  await page.keyboard.press("m");
  await expect(moveModeBar(page)).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(moveModeBar(page)).toHaveCount(0);
  await expect(page.getByTestId("move-marker")).toHaveCount(0);
  // The ticked row is still ticked, so the selection toolbar is back and M starts it again.
  await expect(bulkToolbar(page)).toContainText("1 item selected");
  await page.keyboard.press("m");
  await expect(moveModeBar(page)).toBeVisible();
  await moveModeBar(page).getByRole("button", { exact: true, name: "Cancel" }).click();
  await expect(moveModeBar(page)).toHaveCount(0);
});

test("Move in the context menu starts Move mode with that row, or with the selection", async ({
  page,
}) => {
  await openContentTree(page);
  await openRowMenu(pageRow(page, "Home"));
  await menuItem(page, "Move").click();
  await expect(moveModeBar(page)).toContainText("Moving 1 item");
  await page.keyboard.press("Escape");

  await rowCheckbox(page, "Home").check();
  await rowCheckbox(page, "Blog").check();
  await openRowMenu(pageRow(page, "Home"));
  await expect(contextMenu(page).getByRole("menuitem")).toHaveText(["Move", "Move to..."]);
  await menuItem(page, "Move").click();
  await expect(moveModeBar(page)).toContainText("Moving 2 items");
});

test("folders open and close while Move mode is on", async ({ page }) => {
  await openContentTree(page);
  await rowCheckbox(page, "Home").check();
  await page.keyboard.press("m");

  await expandFolder(page, "Company");
  await expect(pageRow(page, "Contact")).toBeVisible();
  await folderRow(page, "Company").getByRole("button", { name: "Collapse Company" }).click();
  await expect(pageRow(page, "Contact")).toHaveCount(0);
  await expect(moveModeBar(page)).toBeVisible();
});

test("Escape in the confirmation closes only the confirmation, and keeps Move mode", async ({
  page,
  request,
}) => {
  const fromId = await addFolder(request, "Mode Escape From");
  const toId = await addFolder(request, "Mode Escape To");
  await addPage(request, "Mode Escape Page", fromId);
  await openContentTree(page);
  await expandFolder(page, "Mode Escape From");
  await rowCheckbox(page, "Mode Escape Page").check();
  await page.keyboard.press("m");

  await marker(page, `inside:${toId}`).click();
  await expect(confirmDialog(page)).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(confirmDialog(page)).toHaveCount(0);
  await expect(moveModeBar(page)).toBeVisible();
  // Nothing moved, and the next Escape leaves Move mode.
  expect((await childrenOf(request, fromId)).map((row) => row.title)).toEqual(["Mode Escape Page"]);
  await page.keyboard.press("Escape");
  await expect(moveModeBar(page)).toHaveCount(0);
});
