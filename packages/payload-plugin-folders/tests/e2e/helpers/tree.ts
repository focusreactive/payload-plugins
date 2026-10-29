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

/** Opens the Content tree through the nav, as an editor would. */
export const openContentTree = async (page: Page): Promise<void> => {
  await page.goto("/admin");
  await page.getByRole("link", { name: "Content", exact: true }).first().click();
  await page.getByRole("treegrid").waitFor();
};

/** The names of the rows at one level of the tree, top to bottom. */
export const rowNamesAtLevel = (page: Page, level: number): Locator =>
  page.locator(`[data-testid="tree-row"][aria-level="${level}"] [data-testid="row-name"]`);
