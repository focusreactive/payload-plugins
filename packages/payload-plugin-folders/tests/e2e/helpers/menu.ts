import type { Locator, Page } from "@playwright/test";

/** The open context menu (or the Create menu, which is the same component). */
export const contextMenu = (page: Page): Locator => page.getByTestId("context-menu");

/** One entry of the open menu, by its label. */
export const menuItem = (page: Page, name: string): Locator =>
  contextMenu(page).getByRole("menuitem", { exact: true, name });

/** Right-clicks a row's name, as an editor opens the context menu with the mouse. */
export const openRowMenu = async (row: Locator): Promise<void> => {
  await row.getByTestId("row-name").click({ button: "right" });
};

/** The reason an entry that is off shows beside it. */
export const menuReason = (page: Page, name: string): Locator =>
  menuItem(page, name).locator("xpath=following-sibling::*[@data-testid='menu-item-reason']");
