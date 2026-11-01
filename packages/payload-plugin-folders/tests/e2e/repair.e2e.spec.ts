import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

import { createFolder, removeFolderTree } from "./helpers/content.js";
import { writeFolderPathDrift } from "./helpers/drift.js";
import { folderRow, openContentTree } from "./helpers/tree.js";
import { signInAs } from "./helpers/users.js";

// Each test makes its own folder and corrupts its path, so the seeded tree stays healthy for the
// other specs, whatever happens in between.
test.use({ viewport: { height: 900, width: 1280 } });

const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  for (const id of createdFolders.splice(0).toReversed()) {
    if ((await request.get(`/api/folders/${id}?depth=0`)).ok()) {
      await removeFolderTree(request, id);
    }
  }
});

const addDriftedFolder = async (
  request: APIRequestContext,
  name: string
): Promise<{ id: number; path: string }> => {
  const slug = name.toLowerCase().replaceAll(" ", "-");
  const id = await createFolder(request, { name, slug });
  createdFolders.push(id);
  await writeFolderPathDrift(id, "/somewhere-else");

  return { id, path: `/${slug}` };
};

const rebuildEntry = (page: Page): Locator =>
  page.getByTestId("header-menu").getByRole("menuitem", { exact: true, name: "Rebuild full URLs" });

const openMoreMenu = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "More actions" }).click();
};

const repairDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("repair-dialog") });

/** What the folder's full path is in the database right now, in the default language. */
const fullPathOf = async (request: APIRequestContext, id: number): Promise<string> => {
  const response = await request.get(`/api/folders/${id}?depth=0&locale=en`);

  return ((await response.json()) as { fullPath: string }).fullPath;
};

test("an admin sees Rebuild full URLs and an editor does not", async ({
  baseURL,
  browser,
  page,
}) => {
  await openContentTree(page);
  await openMoreMenu(page);
  await expect(rebuildEntry(page)).toBeVisible();
  await page.keyboard.press("Escape");

  // The dev app's `access.repair` is for the admin role: an editor passes every other rule and
  // still gets no menu, because the quick verify answers `canRepair: false`.
  const editor = await signInAs(browser, baseURL ?? "", "editor@example.com");
  try {
    await openContentTree(editor.page);
    await expect(folderRow(editor.page, "Blog")).toBeVisible();
    await expect(editor.page.getByRole("button", { name: "More actions" })).toHaveCount(0);
    await expect(editor.page.getByTestId("create-button")).toBeVisible();
  } finally {
    await editor.context.close();
  }
});

test("an editor sees the notice about out of date URLs, but no way to rebuild them", async ({
  baseURL,
  browser,
  request,
}) => {
  await addDriftedFolder(request, "Editor Notice Lab");
  const editor = await signInAs(browser, baseURL ?? "", "editor@example.com");
  try {
    await openContentTree(editor.page);
    const banner = editor.page.getByTestId("drift-banner");
    await expect(banner).toContainText("Some URLs are out of date.");
    await expect(banner).toContainText("Ask an admin to rebuild them.");
    await expect(banner.getByRole("button")).toHaveCount(0);
    // The banner proves the quick verify has been answered, so the missing menu is its answer
    // and not a page that has not got that far.
    await expect(editor.page.getByRole("button", { name: "More actions" })).toHaveCount(0);
  } finally {
    await editor.context.close();
  }
});

test("the dry run lists a drifted folder", async ({ page, request }) => {
  const { id, path } = await addDriftedFolder(request, "Dry Run Lab");
  await openContentTree(page);

  await openMoreMenu(page);
  await rebuildEntry(page).click();

  const dialog = repairDialog(page);
  await expect(dialog.getByTestId("repair-fixed")).toContainText("1 problem will be fixed");
  await expect(dialog.getByTestId("repair-fixed")).toContainText(
    `should be at ${path} in en but holds /somewhere-else`
  );
  await expect(dialog.getByTestId("repair-url-changes")).toContainText("URL");
  // Nothing is left for a person to settle here, so there is no such list.
  await expect(dialog.getByTestId("repair-conflicts")).toHaveCount(0);

  // The list is a dry run: closing the dialog leaves the database as it was.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(repairDialog(page)).toHaveCount(0);
  expect(await fullPathOf(request, id)).toBe("/somewhere-else");
  await expect(page.getByTestId("drift-banner")).toBeVisible();
});

test("running it clears the banner", async ({ page, request }) => {
  const { id, path } = await addDriftedFolder(request, "Repair Run Lab");
  await openContentTree(page);
  // The banner has its own button for it, as well as the menu.
  const banner = page.getByTestId("drift-banner");
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Rebuild full URLs" }).click();

  const dialog = repairDialog(page);
  await expect(dialog.getByTestId("repair-fixed")).toContainText("1 problem will be fixed");
  await dialog.getByTestId("repair-submit").click();

  await expect(repairDialog(page)).toHaveCount(0);
  await expect(page.getByTestId("drift-banner")).toHaveCount(0);
  expect(await fullPathOf(request, id)).toBe(path);
  // The row shows the path it has now, without a reload.
  await expect(folderRow(page, "Repair Run Lab").getByTestId("row-path")).toHaveText(path);
  const verify = await request.get("/api/folders-tree/verify?quick=1");
  expect(((await verify.json()) as { ok: boolean }).ok).toBe(true);
});

test("a healthy tree has nothing to rebuild, and the dialog says so", async ({ page }) => {
  await openContentTree(page);
  await expect(page.getByTestId("drift-banner")).toHaveCount(0);

  await openMoreMenu(page);
  await rebuildEntry(page).click();

  const dialog = repairDialog(page);
  await expect(dialog.getByTestId("repair-clean")).toHaveText(
    "Every URL is up to date. There is nothing to rebuild."
  );
  await expect(dialog.getByTestId("repair-submit")).toBeDisabled();
});
