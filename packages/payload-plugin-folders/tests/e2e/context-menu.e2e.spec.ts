import { expect, test } from "@playwright/test";

import { childrenOf, createFolder, createPage, redirectsFrom } from "./helpers/content.js";
import { contextMenu, menuItem, menuReason, openRowMenu } from "./helpers/menu.js";
import { expandFolder, folderRow, openContentTree, pageRow, rowCheckbox } from "./helpers/tree.js";

// Every test that changes anything works on its own folder, so the seeded tree the other specs read
// stays as it is.
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
  folder: number,
  status: "draft" | "published" = "published"
): Promise<number> => {
  const id = await createPage(request, {
    folder,
    slug: title.toLowerCase().replaceAll(" ", "-"),
    status,
    title,
  });
  createdPages.push(id);

  return id;
};

test("a page menu has Set as root page", async ({ page }) => {
  await openContentTree(page);
  await expandFolder(page, "Company");
  await openRowMenu(pageRow(page, "Contact"));

  // Company has a root page already, so the entry is there and off, with the page's name as reason.
  const entry = menuItem(page, "Set as root page");
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute("aria-disabled", "true");
  await expect(menuReason(page, "Set as root page")).toHaveText(
    "About Us is already the root page"
  );
  await expect(menuItem(page, "Open")).toBeVisible();
  await expect(menuItem(page, "Open in new tab")).toBeVisible();
  await expect(menuItem(page, "Move to...")).toBeVisible();
});

test("Set as root page confirms the URL change, then saves the page and writes a redirect", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Root Probe");
  const pageId = await addPage(request, "Landing Probe", folderId);
  await openContentTree(page);
  await expandFolder(page, "Root Probe");
  await openRowMenu(pageRow(page, "Landing Probe"));
  await expect(menuItem(page, "Set as root page")).not.toHaveAttribute("aria-disabled", "true");
  await menuItem(page, "Set as root page").click();

  const dialog = page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });
  await expect(dialog.getByTestId("url-change-summary")).toHaveText("1 published URL will change.");
  await expect(dialog.getByTestId("url-samples")).toContainText(
    "/root-probe/landing-probe becomes /root-probe"
  );
  await dialog.getByRole("button", { exact: true, name: "Set as root page" }).click();
  await expect(page.getByText('"Landing Probe" is now the root page of /root-probe')).toBeVisible();

  await page.reload();
  const saved = await request.get(`/api/pages/${pageId}`);
  expect(((await saved.json()) as { isFolderRoot: boolean }).isFolderRoot).toBe(true);
  expect((await childrenOf(request, folderId)).map((row) => [row.title, row.fullPath])).toEqual([
    ["Landing Probe", "/root-probe"],
  ]);
  expect(await redirectsFrom(request, "/root-probe/landing-probe")).toBeGreaterThan(0);
  await expandFolder(page, "Root Probe");
  await expect(pageRow(page, "Landing Probe").getByTestId("root-page-icon")).toBeVisible();
  // The folder's own row lost its "no page" chip.
  await expect(folderRow(page, "Root Probe").getByTestId("no-page-chip")).toHaveCount(0);
});

test("Set as root page on a draft asks nothing and keeps the page out of the live site", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Draft Root Probe");
  const pageId = await addPage(request, "Draft Landing", folderId, "draft");
  await openContentTree(page);
  await expandFolder(page, "Draft Root Probe");
  await openRowMenu(pageRow(page, "Draft Landing"));
  await menuItem(page, "Set as root page").click();

  await expect(
    page.getByText(
      '"Draft Landing" becomes the root page of /draft-root-probe when it is published'
    )
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.reload();
  const draft = await request.get(`/api/pages/${pageId}?draft=true`);
  expect(((await draft.json()) as { isFolderRoot: boolean }).isFolderRoot).toBe(true);
  // Still a draft: the tree, which follows the live row, shows no root page yet.
  expect((await childrenOf(request, folderId)).map((row) => row.fullPath)).toEqual([
    "/draft-root-probe/draft-landing",
  ]);
});

test("Move down swaps two pages and persists", async ({ page, request }) => {
  const folderId = await addFolder(request, "Order Probe");
  // New pages land on top, so Beta Probe is first.
  await addPage(request, "Alpha Probe", folderId);
  await addPage(request, "Beta Probe", folderId);
  expect((await childrenOf(request, folderId)).map((row) => row.title)).toEqual([
    "Beta Probe",
    "Alpha Probe",
  ]);
  await openContentTree(page);
  await expandFolder(page, "Order Probe");

  // The first row cannot go up, and says why.
  await openRowMenu(pageRow(page, "Beta Probe"));
  await expect(menuItem(page, "Move up")).toHaveAttribute("aria-disabled", "true");
  await expect(menuReason(page, "Move up")).toHaveText("It is already the first item here");
  await menuItem(page, "Move down").click();
  await expect(page.getByText("Moved 1 item")).toBeVisible();

  await page.reload();
  expect((await childrenOf(request, folderId)).map((row) => row.title)).toEqual([
    "Alpha Probe",
    "Beta Probe",
  ]);
  await expandFolder(page, "Order Probe");
  // The last row cannot go down.
  await openRowMenu(pageRow(page, "Beta Probe"));
  await expect(menuItem(page, "Move down")).toHaveAttribute("aria-disabled", "true");
  await expect(menuReason(page, "Move down")).toHaveText("It is already the last item here");
});

test("Move to... from the menu acts on every ticked row", async ({ page, request }) => {
  const folderId = await addFolder(request, "Menu Pick Probe");
  await addPage(request, "Pick One", folderId);
  await addPage(request, "Pick Two", folderId);
  await openContentTree(page);
  await expandFolder(page, "Menu Pick Probe");
  await rowCheckbox(page, "Pick One").check();
  await rowCheckbox(page, "Pick Two").check();

  await openRowMenu(pageRow(page, "Pick One"));
  // Opened on a ticked row of two, the menu offers what works on a selection.
  await expect(contextMenu(page).getByRole("menuitem")).toHaveText(["Move", "Move to..."]);
  await menuItem(page, "Move to...").click();

  await expect(page.getByRole("dialog").getByText("Move 2 items to...")).toBeVisible();
});

test("Copy URL copies /company/contact", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await openContentTree(page);
  await expandFolder(page, "Company");
  await openRowMenu(pageRow(page, "Contact"));
  await menuItem(page, "Copy URL").click();

  await expect(page.getByText("Copied /company/contact")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("/company/contact");
});

test("a folder copies its URL only when it has a root page", async ({ page }) => {
  await openContentTree(page);
  await openRowMenu(folderRow(page, "Company"));
  await expect(menuItem(page, "Copy URL")).not.toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");

  await openRowMenu(folderRow(page, "Empty"));
  await expect(menuItem(page, "Copy URL")).toHaveAttribute("aria-disabled", "true");
  await expect(menuReason(page, "Copy URL")).toHaveText(
    "This folder has no root page, so it has no URL of its own"
  );
});

test("View page is hidden without previewUrl", async ({ page }) => {
  await openContentTree(page);
  await openRowMenu(pageRow(page, "Home"));

  await expect(menuItem(page, "Open")).toBeVisible();
  await expect(menuItem(page, "View page")).toHaveCount(0);
});

test("Shift+F10 opens the menu", async ({ page }) => {
  await openContentTree(page);
  const checkbox = rowCheckbox(page, "Home");
  await checkbox.focus();
  await page.keyboard.press("Shift+F10");

  await expect(contextMenu(page)).toBeVisible();
  // The first entry has the focus, the arrows move on, and Escape gives the focus back.
  await expect(menuItem(page, "Open")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menuItem(page, "Open in new tab")).toBeFocused();
  await page.keyboard.press("End");
  await expect(menuItem(page, "Copy URL")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(contextMenu(page)).toHaveCount(0);
  await expect(checkbox).toBeFocused();
});

test("the ContextMenu key and the row button open the menu too", async ({ page }) => {
  await openContentTree(page);
  await rowCheckbox(page, "Home").focus();
  await page.keyboard.press("ContextMenu");
  await expect(contextMenu(page)).toBeVisible();
  await page.keyboard.press("Escape");

  const button = pageRow(page, "Home").getByRole("button", { name: "Actions for Home" });
  await button.click();
  await expect(contextMenu(page)).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  // A press anywhere else closes it without choosing.
  await page.getByRole("treegrid").click({ position: { x: 4, y: 4 } });
  await expect(contextMenu(page)).toHaveCount(0);
});

test("Open on a page opens its edit view, and on a folder expands it", async ({ page }) => {
  await openContentTree(page);
  await openRowMenu(folderRow(page, "Blog"));
  await menuItem(page, "Open").click();
  await expect(pageRow(page, "Blog Home")).toBeVisible();

  await openRowMenu(pageRow(page, "Blog Home"));
  await menuItem(page, "Open").click();
  await expect(page).toHaveURL(/\/admin\/collections\/pages\/\d+$/u);
});
