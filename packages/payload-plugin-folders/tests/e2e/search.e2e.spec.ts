import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

import { childrenOf } from "./helpers/content.js";
import { openContentTree, openZoomedTree, pageRow } from "./helpers/tree.js";

test.use({ viewport: { height: 1000, width: 1280 } });

test.afterEach(async ({ request }) => {
  // A visit with no list in the address restores the saved one; no test may leave its own.
  await request.delete("/api/payload-preferences/foldersTree.expanded");
});

const seededFolderId = async (request: APIRequestContext, title: string): Promise<number> => {
  const row = (await childrenOf(request, "root")).find((child) => child.title === title);
  if (!row) {
    throw new Error(`The seed has no ${title}`);
  }

  return row.id;
};

const searchInput = (page: Page): Locator => page.getByTestId("search-input");

const hitRows = (page: Page): Locator => page.getByTestId("tree").getByTestId("tree-row");

const typeSearch = async (page: Page, text: string): Promise<void> => {
  await searchInput(page).fill(text);
};

/** The titles of the hits, in the order they are listed. */
const hitTitles = async (page: Page): Promise<(string | null)[]> =>
  hitRows(page).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-title")));

test("searching new inside blog finds the 2026 page", async ({ page, request }) => {
  const blogId = await seededFolderId(request, "Blog");
  await openZoomedTree(page, blogId);

  await expect(searchInput(page)).toHaveAttribute("placeholder", "Search in Blog");
  await typeSearch(page, "new");

  await expect(pageRow(page, "New Year")).toBeVisible();
  // The address says what is searched, so the search can be shared and reloaded.
  await expect(page).toHaveURL(/[?&]q=new(&|$)/u);
  expect(await hitTitles(page)).toEqual(["New Year"]);
  // The hit shows its full path, its folders as a breadcrumb, its type and its status.
  const hit = pageRow(page, "New Year");
  await expect(hit.getByTestId("row-path")).toContainText("/blog/2026/new-year");
  await expect(hit.getByTestId("row-breadcrumb")).toHaveText("In Content > Blog > 2026");
  await expect(hit).toContainText("Blog post");
  await expect(hit.getByTestId("status-dot")).toHaveAttribute("data-status", "live");
  await expect(page.getByTestId("search-summary")).toContainText('1 result for "new" in Blog');

  // The tree is replaced by the hits: no folder chevrons, and a reload brings the same hits back.
  await expect(page.getByTestId("expand-toggle")).toHaveCount(0);
  await page.reload();
  await expect(pageRow(page, "New Year")).toBeVisible();
  await expect(searchInput(page)).toHaveValue("new");
});

test("typing sends one search after the pause", async ({ page }) => {
  await openContentTree(page);
  const searches: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith("/folders-tree/search")) {
      searches.push(url.searchParams.get("q") ?? "");
    }
  });

  // Keys 50 ms apart, well inside the pause the box waits for after the last one.
  await searchInput(page).pressSequentially("new year", { delay: 50 });
  await expect(pageRow(page, "New Year")).toBeVisible();
  await page.waitForTimeout(600);

  expect(searches).toEqual(["new year"]);
});

test("the toggle searches everything", async ({ page, request }) => {
  const blogId = await seededFolderId(request, "Blog");
  await openZoomedTree(page, blogId);
  const scope = page.getByTestId("search-scope");

  await typeSearch(page, "blazer");
  await expect(page.getByTestId("search-empty")).toBeVisible();
  await expect(scope).toHaveAttribute("aria-pressed", "true");

  await scope.click();

  await expect(pageRow(page, "Trail Blazer")).toBeVisible();
  await expect(scope).toHaveAttribute("aria-pressed", "false");
  await expect(page).toHaveURL(/[?&]scope=all(&|$)/u);
  await expect(searchInput(page)).toHaveAttribute("placeholder", "Search in Content");

  // And back to the folder: nothing in Blog matches.
  await scope.click();
  await expect(page.getByTestId("search-empty")).toBeVisible();
  await expect(page).not.toHaveURL(/scope=all/u);
});

test("a quoted phrase matches exactly", async ({ page }) => {
  await openContentTree(page);

  // Unquoted, each word has to be somewhere: "blog" in the folder path, "2026" in it too.
  await typeSearch(page, "blog 2026");
  await expect(pageRow(page, "New Year")).toBeVisible();
  await expect(pageRow(page, "Spring Update")).toBeVisible();

  // Quoted, the two words together are not in any title, segment or path.
  await typeSearch(page, '"blog 2026"');
  await expect(page.getByTestId("search-empty")).toBeVisible();
  await expect(page.getByTestId("search-empty")).toContainText(
    'No results for ""blog 2026"" in Content'
  );

  // A phrase that is in a title does match.
  await typeSearch(page, '"new year"');
  await expect(page.getByTestId("search-summary")).toContainText(
    '1 result for ""new year"" in Content'
  );
  expect(await hitTitles(page)).toEqual(["New Year"]);
});

test("article narrows to Article pages", async ({ page }) => {
  await openContentTree(page);

  await typeSearch(page, "blog");
  await expect(pageRow(page, "New Year")).toBeVisible();
  // Pages and folders match "blog" as well.
  await expect(pageRow(page, "Team")).toBeVisible();

  // The name of a page type, "Blog post" here (the dev app's label for the Article type), limits the
  // hits to that type instead of being searched for.
  await typeSearch(page, "blog post");
  await expect(page.getByTestId("search-summary")).toContainText(
    '2 results for "blog post" in Content'
  );
  expect(await hitTitles(page)).toEqual(["New Year", "Spring Update"]);
  await expect(hitRows(page).locator('[data-testid="row-path"]')).toHaveCount(2);
  for (const type of await hitRows(page).locator(".fr-folders-cell--type").allTextContents()) {
    expect(type).toBe("Blog post");
  }
});

test("the type and status filters narrow the hits", async ({ page }) => {
  await openContentTree(page);
  await typeSearch(page, "blog");
  await expect(pageRow(page, "Team")).toBeVisible();

  await page.getByTestId("search-filters-button").click();
  await page.getByRole("checkbox", { name: "Blog post" }).check();
  await expect(pageRow(page, "New Year")).toBeVisible();
  await expect(pageRow(page, "Team")).toHaveCount(0);
  await expect(page.getByTestId("search-filters-button")).toContainText("Filters (1)");

  await page.getByRole("checkbox", { name: "Blog post" }).uncheck();
  await page.getByRole("checkbox", { name: "Page", exact: true }).check();
  await page.getByRole("checkbox", { name: "Draft", exact: true }).check();
  await expect(page.getByTestId("search-summary")).toContainText("1 result");
  expect(await hitTitles(page)).toEqual(["Upcoming Launch"]);
  for (const status of await hitRows(page)
    .getByTestId("status-dot")
    .evaluateAll((dots) => dots.map((dot) => dot.getAttribute("data-status")))) {
    expect(status).toBe("draft");
  }

  // Leaving the search forgets its filters.
  await searchInput(page).press("Escape");
  await expect(page.getByTestId("tree")).toBeVisible();
  await typeSearch(page, "blog");
  await expect(page.getByTestId("search-filters-button")).toContainText("Filters");
  await expect(page.getByTestId("search-filters-button")).not.toContainText("(");
});

test("no results offers Search everywhere", async ({ page, request }) => {
  const blogId = await seededFolderId(request, "Blog");
  await openZoomedTree(page, blogId);

  await typeSearch(page, "blazer");

  const empty = page.getByTestId("search-empty");
  await expect(empty).toContainText('No results for "blazer" in Blog');
  await page.getByTestId("search-everywhere").click();
  await expect(pageRow(page, "Trail Blazer")).toBeVisible();
  await expect(page).toHaveURL(/[?&]scope=all(&|$)/u);

  // At the top level the search already covers everything: the link is not offered.
  await openContentTree(page);
  await typeSearch(page, "zzzz");
  await expect(page.getByTestId("search-empty")).toContainText('No results for "zzzz" in Content');
  await expect(page.getByTestId("search-everywhere")).toHaveCount(0);
});

test("Escape expands to the focused result", async ({ page }) => {
  await openContentTree(page);
  // A CI runner has two slow cores: the tree rebuilds well after the keys are pressed, and the
  // row's focus has to survive that.
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await typeSearch(page, "new year");
  await expect(pageRow(page, "New Year")).toBeVisible();

  // Arrow Down in the box moves to the first hit.
  await searchInput(page).press("ArrowDown");
  await expect(pageRow(page, "New Year")).toBeFocused();
  await page.keyboard.press("Escape");

  // The tree is back with Blog and 2026 open, and the hit's row has the keyboard.
  await expect(page).not.toHaveURL(/[?&]q=/u);
  await expect(page.getByTestId("search-summary")).toHaveCount(0);
  await expect(pageRow(page, "New Year")).toBeVisible();
  await expect(pageRow(page, "New Year")).toBeFocused();
  await expect(page.getByTestId("tree").getByTestId("tree-row").first()).toBeVisible();
  await expect(
    page.locator('[data-testid="tree-row"][data-kind="folder"][data-title="Blog"]')
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator('[data-testid="tree-row"][data-kind="folder"][data-title="2026"]')
  ).toHaveAttribute("aria-expanded", "true");
});
