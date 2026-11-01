import type { Locator, Page } from "@playwright/test";

export const folderRow = (page: Page, title: string): Locator =>
  page.locator(`[data-testid="tree-row"][data-kind="folder"][data-title="${title}"]`);

export const pageRow = (page: Page, title: string): Locator =>
  page.locator(`[data-testid="tree-row"][data-kind="page"][data-title="${title}"]`);

/** Opens a folder through its chevron, by the accessible name the row gives it. */
export const expandFolder = async (page: Page, title: string): Promise<void> => {
  await folderRow(page, title)
    .getByRole("button", { name: `Expand ${title}` })
    .click();
};

/**
 * Opens the Content tree with every folder closed. An empty `?expanded=` says so in the address,
 * which the tree reads before the open folders saved in the admin preferences: without it, a
 * folder one test left open would still be open in the next.
 */
export const openContentTree = async (page: Page): Promise<void> => {
  await page.goto("/admin/collections/folders?expanded=");
  await page.getByRole("treegrid").waitFor();
};

/**
 * Reloads the page with every folder closed. The open folders are kept in the address now, so a
 * plain reload brings them back; a test that reloads to read what the server holds, and then opens
 * the folders it needs, asks for the closed tree the way it always got one.
 */
export const reloadClosed = async (page: Page): Promise<void> => {
  const url = new URL(page.url());
  url.searchParams.set("expanded", "");
  await page.goto(url.toString());
};

/** Opens the Content tree zoomed into a folder, straight from the address. */
export const openZoomedTree = async (page: Page, folderId: number | string): Promise<void> => {
  await page.goto(`/admin/collections/folders?expanded=&folder=${folderId}`);
  // The zoomed folder has no treegrid when it is empty (a panel stands in), but it always has its header.
  await page.getByTestId("zoom-header").waitFor();
};

/** The breadcrumbs above a zoomed tree. */
export const breadcrumbs = (page: Page): Locator => page.getByTestId("breadcrumbs");

/** A crumb that is a link, by the name of its folder (`Content` is the top level). */
export const breadcrumb = (page: Page, title: string): Locator =>
  breadcrumbs(page).getByTestId("breadcrumb").filter({ hasText: title });

/** The last crumb: the zoomed folder itself, which is also the zoom header's drop target. */
export const zoomHeader = (page: Page): Locator => page.getByTestId("zoom-header");

/** The names of the rows at one level of the tree, top to bottom. */
export const rowNamesAtLevel = (page: Page, level: number): Locator =>
  page.locator(`[data-testid="tree-row"][aria-level="${level}"] [data-testid="row-name"]`);

/** The checkbox of a row, by the accessible name the row gives it. */
export const rowCheckbox = (page: Page, title: string): Locator =>
  page.getByRole("checkbox", { exact: true, name: `Select ${title}` });

/** The selection toolbar that takes the header's place while anything is selected. */
export const bulkToolbar = (page: Page): Locator => page.getByTestId("bulk-toolbar");

/** A button of the selection toolbar. */
export const toolbarButton = (page: Page, name: string): Locator =>
  bulkToolbar(page).getByRole("button", { exact: true, name });
