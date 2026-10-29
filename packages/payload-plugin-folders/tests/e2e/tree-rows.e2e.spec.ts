import { expect, test } from "@playwright/test";

import { archivePageCount } from "./globalSetup.js";
import { expandFolder, folderRow, openContentTree, pageRow } from "./helpers/tree.js";

test.beforeEach(async ({ page }) => {
  await openContentTree(page);
});

test("expanding blog shows Blog Home with a house icon", async ({ page }) => {
  await expandFolder(page, "Blog");

  const blogHome = pageRow(page, "Blog Home");
  await expect(blogHome).toBeVisible();
  await expect(blogHome).toHaveAttribute("aria-level", "2");
  const house = blogHome.getByRole("img", { name: "Root page" });
  await expect(house).toBeVisible();
  // Only the root page carries the house.
  await expect(pageRow(page, "Hello World").getByRole("img", { name: "Root page" })).toHaveCount(0);

  await house.hover();
  await expect(page.getByText("Root page: its URL is the folder's URL")).toBeVisible();
});

test("rows show the full path under the name", async ({ page }) => {
  await expect(folderRow(page, "Blog").getByTestId("row-path")).toHaveText("/blog");

  await expandFolder(page, "Blog");
  await expect(pageRow(page, "Hello World").getByTestId("row-path")).toHaveText(
    "/blog/hello-world"
  );
  // A root page has its folder's URL.
  await expect(pageRow(page, "Blog Home").getByTestId("row-path")).toHaveText("/blog");

  await expandFolder(page, "2026");
  await expect(folderRow(page, "2026").getByTestId("row-path")).toHaveText("/blog/2026");
  await expect(
    page
      .locator('[data-kind="page"][data-collection="posts"][data-title="New Year"]')
      .getByTestId("row-path")
  ).toHaveText("/blog/2026/new-year");
});

test("a changed page shows the amber dot", async ({ page }) => {
  await expandFolder(page, "Products");

  const changed = pageRow(page, "Pricing").getByTestId("status-dot");
  await expect(changed).toHaveAttribute("data-status", "changed");
  await expect(changed).toHaveAccessibleName("Changed");
  const published = pageRow(page, "Gift Cards").getByTestId("status-dot");
  await expect(published).toHaveAttribute("data-status", "published");

  // The ring is the admin theme's warning colour and the core is the published green.
  const [success, warning] = await page.evaluate(
    (tokens) =>
      tokens.map((token) => {
        const probe = document.createElement("span");
        probe.style.color = `var(${token})`;
        document.body.append(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();

        return resolved;
      }),
    ["--color-icon-success", "--color-icon-warning"]
  );
  const ring = await changed.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      background: style.backgroundColor,
      border: style.borderTopColor,
      width: style.borderTopWidth,
    };
  });
  expect(ring.border).toBe(warning);
  expect(ring.background).toBe(success);
  expect(ring.width).toBe("2px");
  // A published page has the core and no ring.
  await expect(published).toHaveCSS("background-color", success);
  await expect(published).toHaveCSS("border-top-width", "0px");

  // A draft is hollow and grey.
  await expandFolder(page, "Blog");
  const draft = pageRow(page, "Upcoming Launch").getByTestId("status-dot");
  await expect(draft).toHaveAttribute("data-status", "draft");
  await expect(draft).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("empty shows the no page chip", async ({ page }) => {
  await expect(folderRow(page, "Empty").getByTestId("no-page-chip")).toHaveText("no page");
  // Blog has a root page, so it has no chip.
  await expect(folderRow(page, "Blog")).toBeVisible();
  await expect(folderRow(page, "Blog").getByTestId("no-page-chip")).toHaveCount(0);
  // The chip is for the folder, wherever it sits.
  await expandFolder(page, "Blog");
  await expect(folderRow(page, "2026").getByTestId("no-page-chip")).toBeVisible();
});

test("a folder with 150 children shows Load 100 more", async ({ page }) => {
  await expect(folderRow(page, "Archive").getByTestId("child-count")).toHaveText(
    String(archivePageCount)
  );
  await expandFolder(page, "Archive");

  const entries = page.locator('[data-kind="page"][data-title^="Archive entry"]');
  await expect(entries).toHaveCount(100);
  const loadMore = page.getByRole("button", { name: "Load 100 more" });
  await expect(loadMore).toBeVisible();

  await loadMore.click();

  await expect(entries).toHaveCount(archivePageCount);
  await expect(loadMore).toHaveCount(0);
});

test("clicking a page opens its edit view", async ({ page }) => {
  await expandFolder(page, "Blog");

  await pageRow(page, "Hello World").getByTestId("row-name").click();

  await expect(page).toHaveURL(/\/admin\/collections\/pages\/\d+(\?.*)?$/u);
  await expect(page.locator("#field-title")).toHaveValue("Hello World");
});
