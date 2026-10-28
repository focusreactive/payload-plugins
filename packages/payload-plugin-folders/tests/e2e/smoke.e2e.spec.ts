import { expect, test } from "@playwright/test";

// From P-33 on this test must also assert the folders tree view: open the folders collection and
// expect the tree (rows for the seeded folders), not the stock list view. P-05 adds the folders
// collection, so it should also add /admin/collections/folders to this test.
test("admin opens without a login and the pages collection loads", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/admin");
  // admin.autoLogin signs in the dev admin, so the login form never shows.
  await expect(page).not.toHaveURL(/\/admin\/login/u);
  await expect(page.getByRole("link", { name: "Pages", exact: true }).first()).toBeVisible();

  await page.goto("/admin/collections/pages");
  await expect(page).toHaveURL(/\/admin\/collections\/pages$/u);
  await expect(page.getByRole("heading", { name: "Pages" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
