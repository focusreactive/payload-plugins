import { expect, test } from "@playwright/test";

import { archivePageCount } from "./globalSetup.js";
import {
  expandFolder,
  folderRow,
  openContentTree,
  pageRow,
  rowNamesAtLevel,
} from "./helpers/tree.js";
import { startStockServer, stockServerUrl, stopStockServer } from "./helpers/stockServer.js";

test("Content in the nav shows the seeded top-level rows in order", async ({ page }) => {
  await openContentTree(page);

  await expect(page).toHaveURL(/\/admin\/collections\/folders(\?.*)?$/u);
  await expect(page.getByRole("heading", { name: "Content" })).toBeVisible();
  // New folders go on top, and the seed moved Shoes to sit right after Products.
  await expect(rowNamesAtLevel(page, 1)).toHaveText([
    "Archive",
    "Home",
    "Blog",
    "Products",
    "Shoes",
    "Company",
    "Empty",
  ]);
  // The header names the four columns of the tree-grid, after the select column's checkbox and
  // before the actions column, whose button has no header text.
  const header = page.getByRole("columnheader");
  await expect(header).toHaveText(["", "Name", "Status", "Type", "Updated", ""]);
  await expect(page.getByRole("checkbox", { name: "Select all loaded rows" })).toBeVisible();
});

test("treeView false keeps the stock list", async ({ page }) => {
  // The first compile of a second dev server is slow.
  test.setTimeout(300_000);
  try {
    await startStockServer();
    await page.goto(`${stockServerUrl}/admin/collections/folders`);

    // The stock list is Payload's grid of documents, with sortable columns and no tree-grid.
    await expect(page.getByRole("grid", { name: "Content" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sort by Name Ascending" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Blog", exact: true })).toBeVisible();
    await expect(page.getByRole("treegrid")).toHaveCount(0);
  } finally {
    stopStockServer();
  }
});

test("no console errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));

  await openContentTree(page);
  await expect(folderRow(page, "Blog")).toBeVisible();

  // Open and close folders, one inside another.
  await expandFolder(page, "Blog");
  await expect(pageRow(page, "Blog Home")).toBeVisible();
  await expandFolder(page, "2026");
  await expect(
    page.locator('[data-kind="page"][data-collection="posts"][data-title="New Year"]')
  ).toBeVisible();
  await expandFolder(page, "Products");
  await expect(pageRow(page, "Pricing")).toBeVisible();

  // The tooltip of a root page.
  await pageRow(page, "Blog Home").getByTestId("root-page-icon").hover();
  await expect(page.getByText("Root page: its URL is the folder's URL")).toBeVisible();

  // A folder with more rows than one page.
  await expandFolder(page, "Archive");
  await page.getByRole("button", { name: "Load 100 more" }).click();
  await expect(page.locator('[data-kind="page"][data-title^="Archive entry"]')).toHaveCount(
    archivePageCount
  );

  // A double click on a folder, then closing everything again.
  await folderRow(page, "Company").dblclick();
  await expect(pageRow(page, "Contact")).toBeVisible();
  for (const title of ["Archive", "Products", "Blog", "Company"]) {
    await folderRow(page, title)
      .getByRole("button", { name: `Collapse ${title}` })
      .click();
  }
  await expect(rowNamesAtLevel(page, 1)).toHaveCount(7);

  expect(problems).toEqual([]);
});
