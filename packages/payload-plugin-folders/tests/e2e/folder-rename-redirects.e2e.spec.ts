import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

import { createFolder, createPage, redirectsFrom, removeFolderTree } from "./helpers/content.js";
import { menuItem, openRowMenu } from "./helpers/menu.js";
import { confirmDialog, folderSettings } from "./helpers/settings.js";
import { folderRow, openContentTree } from "./helpers/tree.js";

// Each test renames a folder of its own, removed afterwards with what is inside.
const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  for (const id of createdFolders.splice(0).toReversed()) {
    await removeFolderTree(request, id);
  }
});

const addFolderWithPage = async (
  request: APIRequestContext,
  name: string
): Promise<{ id: number; oldPath: string }> => {
  const slug = name.toLowerCase().replaceAll(" ", "-");
  const id = await createFolder(request, { name, slug });
  createdFolders.push(id);
  await createPage(request, { folder: id, slug: "inside", title: `${name} Page` });

  return { id, oldPath: `/${slug}` };
};

const readFolderSlug = async (request: APIRequestContext, id: number): Promise<string> =>
  ((await (await request.get(`/api/folders/${id}?depth=0`)).json()) as { slug: string }).slug;

const redirectCheckbox = (page: Page) =>
  confirmDialog(page).getByRole("checkbox", { name: "Redirect the old URLs" });

const renameInDrawer = async (page: Page, name: string, slug: string): Promise<void> => {
  await openContentTree(page);
  await openRowMenu(folderRow(page, name));
  await menuItem(page, "Settings").click();
  const form = folderSettings(page);
  await expect(form).toBeVisible();
  await form.getByTestId("segment-input").fill(slug);
  await expect(form.getByTestId("segment-status")).toHaveAttribute("data-state", "ok");
  await form.getByRole("button", { exact: true, name: "Save" }).click();
};

const renameInEditView = async (page: Page, id: number, slug: string): Promise<void> => {
  await page.goto(`/admin/collections/folders/${id}`);
  await page.locator("#field-slug").fill(slug);
  await page.getByRole("button", { name: "Save" }).click();
};

test("the folder settings drawer asks with a ticked redirect box and writes the rows by default", async ({
  page,
  request,
}) => {
  const { id, oldPath } = await addFolderWithPage(request, "Drawer Keep Redirects");

  await renameInDrawer(page, "Drawer Keep Redirects", "drawer-kept");

  await expect(redirectCheckbox(page)).toBeChecked();
  await expect(confirmDialog(page).getByTestId("redirect-count")).toContainText("redirect entr");
  await confirmDialog(page).getByRole("button", { exact: true, name: "Rename" }).click();

  await expect(folderRow(page, "Drawer Keep Redirects").getByTestId("row-path")).toHaveText(
    "/drawer-kept"
  );
  expect(await readFolderSlug(request, id)).toBe("drawer-kept");
  expect(await redirectsFrom(request, oldPath)).toBeGreaterThan(0);
});

test("unticking the redirect box in the folder settings drawer renames the folder and writes no redirect", async ({
  page,
  request,
}) => {
  const { id, oldPath } = await addFolderWithPage(request, "Drawer Drop Redirects");

  await renameInDrawer(page, "Drawer Drop Redirects", "drawer-dropped");

  await expect(redirectCheckbox(page)).toBeChecked();
  await redirectCheckbox(page).uncheck();
  await confirmDialog(page).getByRole("button", { exact: true, name: "Rename" }).click();

  await expect(folderRow(page, "Drawer Drop Redirects").getByTestId("row-path")).toHaveText(
    "/drawer-dropped"
  );
  expect(await readFolderSlug(request, id)).toBe("drawer-dropped");
  expect(await redirectsFrom(request, oldPath)).toBe(0);
});

test("the folders edit view asks with a ticked redirect box and writes the rows by default", async ({
  page,
  request,
}) => {
  const { id, oldPath } = await addFolderWithPage(request, "Edit Keep Redirects");

  await renameInEditView(page, id, "edit-kept");

  await expect(redirectCheckbox(page)).toBeChecked();
  await confirmDialog(page).getByRole("button", { exact: true, name: "Rename" }).click();
  await expect(page.getByText("Updated successfully")).toBeVisible();

  expect(await readFolderSlug(request, id)).toBe("edit-kept");
  expect(await redirectsFrom(request, oldPath)).toBeGreaterThan(0);
});

test("unticking the redirect box in the folders edit view renames the folder and writes no redirect", async ({
  page,
  request,
}) => {
  const { id, oldPath } = await addFolderWithPage(request, "Edit Drop Redirects");

  await renameInEditView(page, id, "edit-dropped");

  await expect(redirectCheckbox(page)).toBeChecked();
  await redirectCheckbox(page).uncheck();
  await confirmDialog(page).getByRole("button", { exact: true, name: "Rename" }).click();
  await expect(page.getByText("Updated successfully")).toBeVisible();

  expect(await readFolderSlug(request, id)).toBe("edit-dropped");
  expect(await redirectsFrom(request, oldPath)).toBe(0);
});
