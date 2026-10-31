import { expect, test } from "@playwright/test";

import { archivePageCount } from "./globalSetup.js";
import {
  bulkToolbar,
  expandFolder,
  folderRow,
  openContentTree,
  pageRow,
  rowCheckbox,
  toolbarButton,
} from "./helpers/tree.js";
import { signInAs } from "./helpers/users.js";

test.beforeEach(async ({ page }) => {
  await openContentTree(page);
});

test("shift click selects a range", async ({ page }) => {
  await expandFolder(page, "Blog");
  const treeRows = page.getByTestId("tree-row");
  // Blog's rows in screen order: the root page, then the pages and the 2026 folder.
  await expect(pageRow(page, "Hello World")).toBeVisible();

  await rowCheckbox(page, "Blog Home").check();
  await rowCheckbox(page, "Team").click({ modifiers: ["Shift"] });

  const selected = page.locator('[data-testid="tree-row"][aria-selected="true"]');
  const titlesBetween = await treeRows.evaluateAll((rows) => {
    const titles = rows.map((row) => row.getAttribute("data-title"));
    const from = titles.indexOf("Blog Home");
    const to = titles.indexOf("Team");

    return titles.slice(Math.min(from, to), Math.max(from, to) + 1);
  });
  expect(titlesBetween.length).toBeGreaterThan(2);
  await expect(selected).toHaveCount(titlesBetween.length);
  for (const title of titlesBetween) {
    await expect(treeRows.filter({ has: rowCheckbox(page, title ?? "") })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  }
  await expect(bulkToolbar(page)).toContainText(`${titlesBetween.length} items selected`);
  // A row outside the range is untouched.
  await expect(folderRow(page, "Products")).toHaveAttribute("aria-selected", "false");

  // Shift click on a row's own area selects a range too, and does not open the page.
  await pageRow(page, "Upcoming Launch")
    .getByTestId("row-path")
    .click({ modifiers: ["Shift"] });
  await expect(page).toHaveURL(/\/admin\/collections\/folders(\?.*)?$/u);
  await expect(pageRow(page, "Upcoming Launch")).toHaveAttribute("aria-selected", "true");
});

test("a Cmd or Ctrl click toggles a row and a plain click still opens a page", async ({ page }) => {
  await expandFolder(page, "Blog");
  const modifier = process.platform === "darwin" ? "Meta" : "Control";

  await pageRow(page, "Team")
    .getByTestId("row-path")
    .click({ modifiers: [modifier] });
  await expect(pageRow(page, "Team")).toHaveAttribute("aria-selected", "true");
  await expect(bulkToolbar(page)).toContainText("1 item selected");
  await expect(page).toHaveURL(/\/admin\/collections\/folders(\?.*)?$/u);

  await pageRow(page, "Team")
    .getByTestId("row-path")
    .click({ modifiers: [modifier] });
  await expect(bulkToolbar(page)).toHaveCount(0);

  await pageRow(page, "Team").getByTestId("row-name").click();
  await expect(page).toHaveURL(/\/admin\/collections\/pages\/\d+(\?.*)?$/u);
});

test("the header checkbox selects every loaded row", async ({ page }) => {
  await expandFolder(page, "Archive");
  const entries = page.locator('[data-kind="page"][data-title^="Archive entry"]');
  await expect(entries).toHaveCount(100);
  const loaded = await page.getByTestId("tree-row").count();

  const header = page.getByRole("checkbox", { name: "Select all loaded rows" });
  await header.check();

  await expect(bulkToolbar(page)).toContainText(`${loaded} items selected`);
  await expect(page.locator('[data-testid="tree-row"][aria-selected="true"]')).toHaveCount(loaded);
  await expect(header).toBeChecked();

  // The 50 rows still on the server are not selected when they load: the header shows a mix.
  await page.getByRole("button", { name: "Load 100 more" }).click();
  await expect(entries).toHaveCount(archivePageCount);
  await expect(bulkToolbar(page)).toContainText(`${loaded} items selected`);
  await expect(header).not.toBeChecked();
  expect(await header.evaluate((input: HTMLInputElement) => input.indeterminate)).toBe(true);

  // Pressing it again completes the selection over the rows that are loaded now.
  await header.click();
  await expect(bulkToolbar(page)).toContainText(
    `${loaded + archivePageCount - 100} items selected`
  );
  await header.click();
  await expect(bulkToolbar(page)).toHaveCount(0);
});

test("Settings shows for one page and one folder and hides for two items", async ({ page }) => {
  await expandFolder(page, "Blog");

  await rowCheckbox(page, "Hello World").check();
  await expect(bulkToolbar(page)).toContainText("1 item selected");
  await expect(toolbarButton(page, "Settings")).toBeVisible();

  await rowCheckbox(page, "Hello World").uncheck();
  await rowCheckbox(page, "Empty").check();
  await expect(folderRow(page, "Empty")).toHaveAttribute("aria-selected", "true");
  await expect(toolbarButton(page, "Settings")).toBeVisible();

  await rowCheckbox(page, "Hello World").check();
  await expect(bulkToolbar(page)).toContainText("2 items selected");
  await expect(toolbarButton(page, "Settings")).toHaveCount(0);
  // The other buttons are all there.
  for (const name of [
    "Move",
    "Move to...",
    "Duplicate",
    "Publish",
    "Unpublish",
    "Delete",
    "Cancel",
  ]) {
    await expect(toolbarButton(page, name)).toBeVisible();
  }
});

test("a drafter sees Publish disabled", async ({ baseURL, browser, page }) => {
  // The admin may publish: the control for what follows.
  await expandFolder(page, "Blog");
  await rowCheckbox(page, "Hello World").check();
  await expect(toolbarButton(page, "Publish")).toBeEnabled();
  await expect(toolbarButton(page, "Unpublish")).toBeEnabled();

  const drafter = await signInAs(browser, baseURL ?? "", "drafter@example.com");
  try {
    await openContentTree(drafter.page);
    await expandFolder(drafter.page, "Blog");
    await rowCheckbox(drafter.page, "Hello World").check();

    await expect(toolbarButton(drafter.page, "Publish")).toBeDisabled();
    await expect(toolbarButton(drafter.page, "Unpublish")).toBeDisabled();
    // A drafter still saves drafts, so moving and the rest stay on.
    await expect(toolbarButton(drafter.page, "Move to...")).toBeEnabled();
    await expect(toolbarButton(drafter.page, "Duplicate")).toBeEnabled();

    // The reason is on hover, and it names nothing about the rows.
    await toolbarButton(drafter.page, "Publish").hover();
    await expect(drafter.page.getByRole("tooltip")).toHaveText(
      "Your role does not allow this for every selected item"
    );
    // Pressing it does nothing.
    await toolbarButton(drafter.page, "Publish").click({ force: true });
    await expect(bulkToolbar(drafter.page)).toContainText("1 item selected");
  } finally {
    await drafter.context.close();
  }
});

test("Cancel clears the selection", async ({ page }) => {
  await expandFolder(page, "Blog");
  await rowCheckbox(page, "Hello World").check();
  await rowCheckbox(page, "Team").check();
  await expect(bulkToolbar(page)).toContainText("2 items selected");
  await expect(page.getByRole("heading", { name: "Content" })).toHaveCount(0);

  await toolbarButton(page, "Cancel").click();

  await expect(bulkToolbar(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Content" })).toBeVisible();
  await expect(page.locator('[data-testid="tree-row"][aria-selected="true"]')).toHaveCount(0);
  await expect(rowCheckbox(page, "Hello World")).not.toBeChecked();
  await expect(rowCheckbox(page, "Team")).not.toBeChecked();
});
