import type { Locator, Page } from "@playwright/test";

/** The settings drawer of a folder, once it has loaded its form. */
export const folderSettings = (page: Page): Locator => page.getByTestId("folder-settings-form");

/** The settings drawer of a page, once it has loaded its form. */
export const pageSettings = (page: Page): Locator => page.getByTestId("page-settings-form");

/** The confirmation dialogs the settings saves ask (URL changes, locking types). */
export const confirmDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });

export const unrootDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("unroot-form") });
