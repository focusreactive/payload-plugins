import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

import {
  childrenOf,
  createFolder,
  createPage,
  readPage,
  removeFolderTree,
} from "./helpers/content.js";
import { moveOver, startDrag } from "./helpers/drag.js";
import { menuItem, openRowMenu } from "./helpers/menu.js";

// Every test builds its own folders and removes them with what is inside, so the seeded tree the
// other specs read is never changed. The sidebar remembers the open tab in the user's preferences,
// and a Tree tab left open would put a second tree on every page of the specs after this one, so
// the preference is deleted after each test.
test.use({ viewport: { height: 1000, width: 1400 } });

const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  for (const id of createdFolders.splice(0).toReversed()) {
    if ((await request.get(`/api/folders/${id}?depth=0`)).ok()) {
      await removeFolderTree(request, id);
    }
  }
  await request.delete("/api/payload-preferences/nav-sidebar-active-tab");
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

const addDraft = (request: APIRequestContext, title: string, folder: number): Promise<number> =>
  createPage(request, { folder, slug: slugOf(title), status: "draft", title });

/** The sidebar tab's tree, and the rows in it. */
const tab = (page: Page): Locator => page.getByTestId("sidebar-tab");
const tabRow = (page: Page, title: string): Locator =>
  tab(page).locator(`[data-testid="tree-row"][data-title="${title}"]`);

/** The tree view's own tree, on the page beside the tab. */
const view = (page: Page): Locator => page.locator(".collection-list.fr-folders");
const viewRow = (page: Page, title: string): Locator =>
  view(page).locator(`[data-testid="tree-row"][data-title="${title}"]`);

/** The titles of the rows in a tree, top to bottom. */
const rowTitles = (root: Locator): Promise<string[]> =>
  root
    .locator('[data-testid="tree-row"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-title") ?? ""));

const openTreeTab = async (page: Page): Promise<void> => {
  await page.getByRole("tab", { name: "Tree" }).click();
  await tab(page).getByRole("treegrid").waitFor();
};

const openEditView = async (page: Page, id: number): Promise<void> => {
  await page.goto(`/admin/collections/pages/${id}`);
  await page.getByTestId("folder-location").waitFor();
};

test("the open nested page is highlighted with ancestors expanded", async ({ page, request }) => {
  const outer = await addFolder(request, "Tab Outer");
  const inner = await addFolder(request, "Tab Inner", outer);
  const deepId = await addDraft(request, "Tab Deep", inner);
  await addDraft(request, "Tab Sibling", inner);

  await openEditView(page, deepId);
  await openTreeTab(page);

  // The folders above the open page are open, and its row is the one marked as current.
  await expect(tabRow(page, "Tab Outer")).toHaveAttribute("aria-expanded", "true");
  await expect(tabRow(page, "Tab Inner")).toHaveAttribute("aria-expanded", "true");
  await expect(tabRow(page, "Tab Deep")).toHaveAttribute("aria-current", "page");
  await expect(tabRow(page, "Tab Sibling")).not.toHaveAttribute("aria-current", "page");
  await expect(tab(page).locator('[aria-current="page"]')).toHaveCount(1);
  // Compact: the name and the status dot, no checkbox, no columns.
  await expect(tabRow(page, "Tab Deep").getByTestId("status-dot")).toHaveAttribute(
    "data-status",
    "draft"
  );
  await expect(tab(page).getByRole("checkbox")).toHaveCount(0);
  await expect(tab(page).getByRole("columnheader")).toHaveCount(0);
  // A folder that does not hold the page stays closed.
  await expect(tabRow(page, "Archive")).toHaveAttribute("aria-expanded", "false");

  // The compact grid has no serious or critical accessibility finding.
  const results = await new AxeBuilder({ page })
    .include('[data-testid="sidebar-tab"]')
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

test("navigating to another page moves the highlight", async ({ page, request }) => {
  const outer = await addFolder(request, "Walk Outer");
  const first = await addDraft(request, "Walk First", outer);
  const second = await addDraft(request, "Walk Second", outer);
  const elsewhere = await addFolder(request, "Walk Elsewhere");
  const third = await addDraft(request, "Walk Third", elsewhere);

  await openEditView(page, first);
  await openTreeTab(page);
  await expect(tabRow(page, "Walk First")).toHaveAttribute("aria-current", "page");

  // Clicking a row opens the page without a reload, and the mark follows.
  await page.evaluate(() => {
    (window as unknown as { __noReload: boolean }).__noReload = true;
  });
  await tabRow(page, "Walk Second").getByTestId("row-name").click();
  await expect(page).toHaveURL(new RegExp(`/admin/collections/pages/${second}$`, "u"));
  await expect(tabRow(page, "Walk Second")).toHaveAttribute("aria-current", "page");
  await expect(tabRow(page, "Walk First")).not.toHaveAttribute("aria-current", "page");

  // A page in a folder that is closed: it opens its folders and takes the mark.
  await page.goto(`/admin/collections/pages/${third}`);
  await page.getByTestId("folder-location").waitFor();
  await expect(tabRow(page, "Walk Third")).toHaveAttribute("aria-current", "page");
  await expect(tabRow(page, "Walk Elsewhere")).toHaveAttribute("aria-expanded", "true");
  await expect(tab(page).locator('[aria-current="page"]')).toHaveCount(1);

  // Back to the page before: the mark goes back with the address.
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/admin/collections/pages/${second}$`, "u"));
  await expect(tabRow(page, "Walk Second")).toHaveAttribute("aria-current", "page");
  expect(
    await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)
  ).toBeUndefined();
});

test("a drag in the tab while the tree view is open updates both without reload", async ({
  page,
  request,
}) => {
  // Payload shows the sidebar tab and the page together, so this is the real case: the tree view
  // is the page, the tab is beside it, and one store feeds both.
  const source = await addFolder(request, "Both Source");
  const target = await addFolder(request, "Both Target");
  await addDraft(request, "Both Mover", source);

  await page.goto(`/admin/collections/folders?expanded=${source},${target}&folder=`);
  await view(page).getByRole("treegrid").waitFor();
  await openTreeTab(page);
  await expect(viewRow(page, "Both Mover")).toBeVisible();
  // The tab opens the folders the view has open: one expanded list, shared.
  await expect(tabRow(page, "Both Mover")).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __noReload: boolean }).__noReload = true;
  });

  await startDrag(page, tabRow(page, "Both Mover"));
  await moveOver(page, tabRow(page, "Both Target"), "inside");
  await page.mouse.up();

  // Both trees show the page under its new folder at once, before the poll that would show it to
  // a tree with a store of its own, and nothing reloaded.
  const quickly = { timeout: 3000 };
  await expect(tabRow(page, "Both Mover")).toHaveAttribute("aria-level", "2", quickly);
  await expect(viewRow(page, "Both Mover")).toHaveAttribute("aria-level", "2", quickly);
  await expect
    .poll(async () => (await childrenOf(request, target)).map((row) => row.title))
    .toEqual(["Both Mover"]);
  expect(await childrenOf(request, source)).toHaveLength(0);
  expect(
    await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)
  ).toBe(true);
  // The row under Both Target in each tree is the page, directly beneath its folder.
  for (const root of [tab(page), view(page)]) {
    const titles = await rowTitles(root);
    expect(titles.indexOf("Both Mover")).toBe(titles.indexOf("Both Target") + 1);
  }
});

test("moving the open page from the tab, letting autosave fire, then publishing keeps the new folder", async ({
  page,
  request,
}) => {
  // Blocker 1 in the browser: the edit form still holds the folder the page was opened in, and
  // both its autosave and its publish send it.
  const source = await addFolder(request, "Blocker Source");
  const target = await addFolder(request, "Blocker Target");
  const pageId = await addDraft(request, "Blocker Page", source);

  await openEditView(page, pageId);
  await openTreeTab(page);
  await expect(tabRow(page, "Blocker Page")).toHaveAttribute("aria-current", "page");
  await expect(tabRow(page, "Blocker Target")).toBeVisible();

  const title = page.locator("#field-title");
  const autosaved = () =>
    page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/pages/${pageId}`) &&
        response.url().includes("autosave=true") &&
        response.ok()
    );

  // The form has an edit of its own, saved by the autosave once already.
  const firstSave = autosaved();
  await title.fill("Blocker Page edited");
  await firstSave;

  // The page moves from the tab while the form is open.
  await startDrag(page, tabRow(page, "Blocker Page"));
  await moveOver(page, tabRow(page, "Blocker Target"), "inside");
  await page.mouse.up();
  await expect
    .poll(async () => (await childrenOf(request, target)).map((row) => row.title))
    .toEqual(["Blocker Page"]);
  // The location above the form says so without a reload.
  await expect(page.getByTestId("location-crumbs")).toContainText("Blocker Target");

  // Another edit: the autosave sends the form's folder, which is the old one.
  const secondSave = autosaved();
  await title.fill("Blocker Page edited twice");
  await secondSave;
  expect((await readPage<{ folder: number }>(request, pageId, { draft: true })).folder).toBe(
    target
  );

  // Publishing sends it again.
  const published = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes(`/api/pages/${pageId}`) &&
      !response.url().includes("autosave=true") &&
      response.ok()
  );
  await page
    .getByRole("button", { exact: true, name: /^Publish/u })
    .first()
    .click();
  await published;

  const live = await readPage<{ _status: string; folder: number }>(request, pageId);
  expect(live._status).toBe("published");
  expect(live.folder).toBe(target);
  expect((await childrenOf(request, target)).map((row) => row.title)).toEqual([
    "Blocker Page edited twice",
  ]);
  expect(await childrenOf(request, source)).toHaveLength(0);
});

test("the tab's rows answer the keyboard, the context menu and Ctrl or Cmd click", async ({
  page,
  request,
}) => {
  const folder = await addFolder(request, "Keys Folder");
  const first = await addDraft(request, "Keys First", folder);
  const second = await addDraft(request, "Keys Second", folder);
  await openEditView(page, first);
  await openTreeTab(page);

  // Arrow keys walk the rows (a new page goes to the top of its folder, so Second is above First),
  // and Enter opens a page: the mark follows the address.
  await tabRow(page, "Keys First").focus();
  await page.keyboard.press("ArrowUp");
  await expect(tabRow(page, "Keys Second")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/admin/collections/pages/${second}$`, "u"));
  await expect(tabRow(page, "Keys Second")).toHaveAttribute("aria-current", "page");

  // The context menu of a row is the tree view's own.
  await openRowMenu(tabRow(page, "Keys Folder"));
  await expect(menuItem(page, "Open")).toBeVisible();
  await expect(menuItem(page, "Move to...")).toBeVisible();
  await page.keyboard.press("Escape");

  // No checkbox, but Ctrl or Cmd click selects, and the selection toolbar appears in the tab.
  const row = tabRow(page, "Keys First");
  await row.click({ modifiers: ["ControlOrMeta"], position: { x: 220, y: 16 } });
  await expect(row).toHaveAttribute("aria-selected", "true");
  await expect(tab(page).getByTestId("bulk-toolbar")).toContainText("1 item selected");
  await tab(page).getByTestId("bulk-toolbar").getByRole("button", { name: "Cancel" }).click();
  await expect(tab(page).getByTestId("bulk-toolbar")).toHaveCount(0);
});

test("a move confirmed in the tree view does not open again with the tab's move", async ({
  page,
  request,
}) => {
  const source = await addFolder(request, "Twin Source");
  const target = await addFolder(request, "Twin Target");
  const viewPage = await createPage(request, {
    folder: source,
    slug: "twin-view-page",
    title: "Twin View Page",
  });
  const tabPage = await createPage(request, {
    folder: source,
    slug: "twin-tab-page",
    title: "Twin Tab Page",
  });

  await page.goto(`/admin/collections/folders?expanded=${source},${target}&folder=`);
  await view(page).getByRole("treegrid").waitFor();
  await openTreeTab(page);
  const confirmDialogs = page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });

  // Moving a published page changes its URL, so the tree view asks first, and the editor says yes.
  await startDrag(page, viewRow(page, "Twin View Page"));
  await moveOver(page, viewRow(page, "Twin Target"), "inside");
  await page.mouse.up();
  await expect(confirmDialogs).toHaveCount(1);
  await confirmDialogs.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(confirmDialogs).toHaveCount(0);
  await expect
    .poll(async () => (await childrenOf(request, target)).map((row) => row.id))
    .toEqual([viewPage]);

  // The same question from the tab is one dialog, about the tab's page, and it moves that page.
  await startDrag(page, tabRow(page, "Twin Tab Page"));
  await moveOver(page, tabRow(page, "Twin Target"), "inside");
  await page.mouse.up();
  await expect(confirmDialogs).toHaveCount(1);
  await expect(confirmDialogs.getByTestId("url-samples")).toContainText("/twin-tab-page");
  await confirmDialogs.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(confirmDialogs).toHaveCount(0);
  await expect(page.getByText("This part of the tree changed")).toHaveCount(0);
  await expect
    .poll(async () => (await childrenOf(request, target)).map((row) => row.id).sort())
    .toEqual([viewPage, tabPage].sort());
});

test("Escape and / answer in the tree that has the focus, with the tab and the tree view both open", async ({
  page,
  request,
}) => {
  const folder = await addFolder(request, "Keys Both");
  await addDraft(request, "Keys Both First", folder);
  await addDraft(request, "Keys Both Second", folder);
  await page.goto(`/admin/collections/folders?expanded=${folder}&folder=`);
  await view(page).getByRole("treegrid").waitFor();
  await openTreeTab(page);
  const viewFirst = viewRow(page, "Keys Both First");
  const tabSecond = tabRow(page, "Keys Both Second");

  // A row ticked in the tree view, and a row cut in the tab.
  await viewFirst.getByRole("checkbox").check();
  await expect(viewFirst).toHaveAttribute("aria-selected", "true");
  await tabSecond.focus();
  await page.keyboard.press("ControlOrMeta+x");
  await expect(tabSecond).toHaveAttribute("data-cut", "true");

  // Escape in the tab ends the tab's cut and leaves the view's ticks alone.
  await page.keyboard.press("Escape");
  await expect(tabSecond).not.toHaveAttribute("data-cut", "true");
  await expect(viewFirst).toHaveAttribute("aria-selected", "true");

  // Escape in the tree view clears the view's ticks.
  await viewFirst.focus();
  await page.keyboard.press("Escape");
  await expect(viewFirst).toHaveAttribute("aria-selected", "false");

  // The slash goes to the search box of the tree it was pressed in.
  await tabSecond.focus();
  await page.keyboard.press("/");
  await expect(tab(page).getByTestId("search-input")).toBeFocused();
  await viewFirst.focus();
  await page.keyboard.press("/");
  await expect(view(page).getByTestId("search-input")).toBeFocused();
});

test("the tree view and the tab each have a search landmark with a name of its own", async ({
  page,
}) => {
  await page.goto("/admin/collections/folders?expanded=&folder=");
  await view(page).getByRole("treegrid").waitFor();
  await openTreeTab(page);

  const landmarks = page.getByRole("search");
  await expect(landmarks).toHaveCount(2);
  await expect(view(page).getByRole("search", { name: "Tree view search" })).toHaveCount(1);
  await expect(tab(page).getByRole("search", { name: "Sidebar tree search" })).toHaveCount(1);
});
