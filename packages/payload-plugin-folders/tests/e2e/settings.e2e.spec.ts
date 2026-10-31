import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

import {
  childrenOf,
  createFolder,
  createPage,
  readPage,
  redirectsFrom,
  removeFolderTree,
} from "./helpers/content.js";
import { menuItem, openRowMenu } from "./helpers/menu.js";
import { confirmDialog, folderSettings, pageSettings, unrootDialog } from "./helpers/settings.js";
import { expandFolder, folderRow, openContentTree, pageRow } from "./helpers/tree.js";

// Tests that change anything work in folders of their own, removed afterwards with what is inside,
// so the seeded tree the other specs read stays as it is. The one test that renames the seeded
// Company folder puts its segment back.
const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  for (const id of createdFolders.splice(0).toReversed()) {
    await removeFolderTree(request, id);
  }
});

const addFolder = async (
  request: APIRequestContext,
  name: string,
  extra: { allowedTypes?: string[]; lockSubfolderTypes?: boolean; parent?: number } = {}
): Promise<number> => {
  const id = await createFolder(request, {
    name,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    ...extra,
  });
  createdFolders.push(id);

  return id;
};

const readFolderSlug = async (request: APIRequestContext, id: number): Promise<string> =>
  ((await (await request.get(`/api/folders/${id}?depth=0`)).json()) as { slug: string }).slug;

test("renaming company asks with the URL count, then the tree shows the new paths", async ({
  page,
  request,
}) => {
  const companyId = (await childrenOf(request, "root")).find((row) => row.title === "Company")?.id;
  expect(companyId).toBeDefined();
  try {
    await openContentTree(page);
    await openRowMenu(folderRow(page, "Company"));
    await menuItem(page, "Settings").click();
    const form = folderSettings(page);
    await expect(form).toBeVisible();
    await expect(form.getByTestId("name-input")).toHaveValue("Company");
    await expect(form.getByTestId("settings-full-url")).toHaveText("/company");

    // The segment is checked while the editor types, and Save waits for a free one.
    await form.getByTestId("segment-input").fill("firm");
    await expect(form.getByTestId("segment-status")).toHaveAttribute("data-state", "ok");
    await form.getByRole("button", { exact: true, name: "Save" }).click();

    // Three published pages sit in Company and each has an English and a German URL.
    const dialog = confirmDialog(page);
    await expect(dialog.getByTestId("url-change-summary")).toContainText(
      "3 published URLs will change"
    );
    await expect(dialog.getByTestId("url-samples")).toContainText("/company/contact");
    await expect(dialog.getByTestId("url-samples")).toContainText("/firm/contact");
    await dialog.getByRole("button", { exact: true, name: "Rename" }).click();

    await expect(folderRow(page, "Company").getByTestId("row-path")).toHaveText("/firm");
    await page.reload();
    expect(await readFolderSlug(request, companyId as number)).toBe("firm");
    expect(
      (await childrenOf(request, companyId as number)).find((row) => row.title === "Contact")
        ?.fullPath
    ).toBe("/firm/contact");
    await expandFolder(page, "Company");
    await expect(pageRow(page, "Contact").getByTestId("row-path")).toHaveText("/firm/contact");
  } finally {
    await request.patch(`/api/folders/${companyId}?depth=0`, { data: { slug: "company" } });
  }
  expect(await readFolderSlug(request, companyId as number)).toBe("company");
});

test("locking types asks first and locks subfolders", async ({ page, request }) => {
  const lockerId = await addFolder(request, "Lock Probe");
  const firstId = await addFolder(request, "Lock Child One", { parent: lockerId });
  const secondId = await addFolder(request, "Lock Child Two", { parent: lockerId });
  await openContentTree(page);
  await openRowMenu(folderRow(page, "Lock Probe"));
  await menuItem(page, "Settings").click();
  const form = folderSettings(page);
  await expect(form).toBeVisible();

  await form.getByRole("radio", { name: "Specific types" }).check();
  await form.getByTestId("type-chips").getByRole("checkbox", { name: "Blog post" }).click();
  await form.getByRole("checkbox", { name: "Lock subfolders' page types" }).check();
  await form.getByRole("button", { exact: true, name: "Save" }).click();

  // Nothing is written before the editor has seen how many folders it reaches.
  const dialog = page.getByRole("dialog").filter({ has: page.getByTestId("confirm-action-body") });
  await expect(dialog.getByTestId("confirm-action-body")).toHaveText(
    "This sets the page types of 2 subfolders."
  );
  const before = await request.get(`/api/folders/${firstId}?depth=0`);
  expect(((await before.json()) as { allowedTypes: string[] }).allowedTypes ?? []).toEqual([]);
  await dialog.getByRole("button", { exact: true, name: "Lock page types" }).click();

  await expect(form).toBeHidden();
  await page.reload();
  for (const childId of [firstId, secondId]) {
    const stored = await request.get(`/api/folders/${childId}?depth=0`);
    expect(await stored.json()).toMatchObject({
      allowedTypes: ["posts"],
      lockSubfolderTypes: false,
      typesLockedBy: lockerId,
    });
  }

  // A locked subfolder shows the lock on its chip, who locked it, and a radio that cannot change.
  await expandFolder(page, "Lock Probe");
  await openRowMenu(folderRow(page, "Lock Child One"));
  await menuItem(page, "Settings").click();
  const locked = folderSettings(page);
  await expect(locked.getByTestId("types-locked")).toContainText("Locked by Lock Probe");
  await expect(locked.getByRole("radio", { name: "Specific types" })).toBeDisabled();
  await expect(locked.getByTestId("type-chips").locator('[data-locked="true"]')).toHaveText([
    "Blog post",
  ]);
});

test("page settings saves a segment as a draft with the URL hint", async ({ page, request }) => {
  const folderId = await addFolder(request, "Hint Folder");
  const pageId = await createPage(request, {
    folder: folderId,
    slug: "hint-probe",
    title: "Hint Probe",
  });
  await openContentTree(page);
  await expandFolder(page, "Hint Folder");
  await openRowMenu(pageRow(page, "Hint Probe"));
  await menuItem(page, "Settings").click();
  const form = pageSettings(page);
  await expect(form.getByTestId("title-input")).toHaveValue("Hint Probe");

  await form.getByTestId("segment-input").fill("hint-probe-2");
  await expect(form.getByTestId("url-hint")).toHaveText(
    "The URL changes from /hint-folder/hint-probe to /hint-folder/hint-probe-2 when published"
  );
  await expect(form.getByTestId("segment-status")).toHaveAttribute("data-state", "ok");
  await form.getByRole("button", { exact: true, name: "Save" }).click();
  await expect(page.getByText("Saved as a draft. The URL changes from")).toBeVisible();

  await page.reload();
  // The live page keeps its URL; only the latest version has the new segment.
  expect(await readPage(request, pageId)).toMatchObject({ slug: "hint-probe" });
  expect(await readPage(request, pageId, { draft: true })).toMatchObject({
    _status: "draft",
    slug: "hint-probe-2",
  });
  expect((await childrenOf(request, folderId)).map((row) => row.fullPath)).toEqual([
    "/hint-folder/hint-probe",
  ]);
});

test("unticking root in page settings opens the un-root dialog", async ({ page, request }) => {
  const folderId = await addFolder(request, "Unroot Folder");
  const rootId = (
    (await (
      await request.post("/api/pages", {
        data: {
          _status: "published",
          folder: folderId,
          isFolderRoot: true,
          slug: "landing",
          title: "Unroot Landing",
        },
      })
    ).json()) as { doc: { id: number } }
  ).doc.id;
  await openContentTree(page);
  await expandFolder(page, "Unroot Folder");
  await openRowMenu(pageRow(page, "Unroot Landing"));
  await menuItem(page, "Settings").click();
  const form = pageSettings(page);
  await expect(form.getByTestId("root-url")).toHaveText(
    "This page is the root page, so its URL is its folder's: /unroot-folder"
  );

  // The box only unticks once the dialog has a segment: clicking it asks.
  await form.getByRole("checkbox", { name: "Folder root page" }).click();
  const dialog = unrootDialog(page);
  await expect(
    dialog.getByRole("heading", { name: "Choose this page's own URL segment" })
  ).toBeVisible();
  // The stored slug is valid and free in the folder, so it is the starting point.
  await expect(dialog.getByTestId("segment-input")).toHaveValue("landing");
  await expect(dialog.getByTestId("unroot-url")).toHaveText(
    "The page's URL becomes /unroot-folder/landing"
  );
  await dialog.getByRole("button", { exact: true, name: "Unset root page" }).click();

  await form.getByRole("button", { exact: true, name: "Save" }).click();
  await expect(form).toBeHidden();
  await page.reload();
  expect(await readPage(request, rootId)).toMatchObject({ isFolderRoot: false, slug: "landing" });
  expect((await childrenOf(request, folderId)).map((row) => row.fullPath)).toEqual([
    "/unroot-folder/landing",
  ]);
});

test("changing the parent in page settings moves the page", async ({ page, request }) => {
  const sourceId = await addFolder(request, "Source Folder");
  const targetId = await addFolder(request, "Target Folder");
  const pageId = await createPage(request, {
    folder: sourceId,
    slug: "traveller",
    title: "Traveller",
  });
  await openContentTree(page);
  await expandFolder(page, "Source Folder");
  await openRowMenu(pageRow(page, "Traveller"));
  await menuItem(page, "Settings").click();
  const form = pageSettings(page);
  await expect(form.getByTestId("parent-name")).toHaveText("Source Folder");

  await form.getByTestId("parent-change").click();
  await form
    .getByTestId("parent-picker")
    .getByRole("treeitem", { name: /Target Folder/u })
    .click();
  await expect(form.getByTestId("parent-name")).toHaveText("Target Folder");
  await form.getByRole("button", { exact: true, name: "Save" }).click();

  // A move that changes a published URL asks, as every move does.
  const dialog = confirmDialog(page);
  await expect(dialog.getByTestId("url-samples")).toContainText(
    "/source-folder/traveller becomes /target-folder/traveller"
  );
  await dialog.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 1 item")).toBeVisible();

  await page.reload();
  expect((await childrenOf(request, targetId)).map((row) => [row.title, row.fullPath])).toEqual([
    ["Traveller", "/target-folder/traveller"],
  ]);
  expect(await childrenOf(request, sourceId)).toEqual([]);
  expect(await readPage(request, pageId)).toMatchObject({ folder: targetId });
});

test("F2 opens Settings for the focused row", async ({ page, request }) => {
  const folderId = await addFolder(request, "F2 Folder");
  await createPage(request, { folder: folderId, slug: "f2-page", title: "F2 Page" });
  await openContentTree(page);
  await expandFolder(page, "F2 Folder");

  await pageRow(page, "F2 Page").focus();
  await page.keyboard.press("F2");
  await expect(pageSettings(page).getByTestId("title-input")).toHaveValue("F2 Page");
  await page.keyboard.press("Escape");
  await expect(pageSettings(page)).toBeHidden();

  await folderRow(page, "F2 Folder").focus();
  await page.keyboard.press("F2");
  await expect(folderSettings(page).getByTestId("name-input")).toHaveValue("F2 Folder");
});

test("a page of a collection without drafts asks about its new URL, then saves it live", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Live Folder");
  const post = await request.post("/api/posts", {
    data: { folder: folderId, slug: "live-post", title: "Live Post" },
  });
  const postId = ((await post.json()) as { doc: { id: number } }).doc.id;
  await openContentTree(page);
  await expandFolder(page, "Live Folder");
  await openRowMenu(pageRow(page, "Live Post"));
  await menuItem(page, "Settings").click();
  const form = pageSettings(page);

  await form.getByTestId("segment-input").fill("live-post-2");
  // No draft state exists here, so the hint says the URL changes on save.
  await expect(form.getByTestId("url-hint")).toHaveText(
    "The URL changes from /live-folder/live-post to /live-folder/live-post-2 when you save"
  );
  await expect(form.getByTestId("segment-status")).toHaveAttribute("data-state", "ok");
  await form.getByRole("button", { exact: true, name: "Save" }).click();

  const dialog = confirmDialog(page);
  await expect(dialog.getByTestId("url-samples")).toContainText(
    "/live-folder/live-post becomes /live-folder/live-post-2"
  );
  // Nothing is written until the editor confirms.
  expect(await readPage(request, postId, { collection: "posts" })).toMatchObject({
    slug: "live-post",
  });
  await dialog.getByRole("button", { exact: true, name: "Save" }).click();
  await expect(form).toBeHidden();

  await page.reload();
  expect(await readPage(request, postId, { collection: "posts" })).toMatchObject({
    slug: "live-post-2",
  });
  expect((await childrenOf(request, folderId)).map((row) => row.fullPath)).toEqual([
    "/live-folder/live-post-2",
  ]);
  expect(await redirectsFrom(request, "/live-folder/live-post")).toBeGreaterThan(0);
});

test("a locked subfolder's type fields are read-only in its edit view, with who locked them", async ({
  page,
  request,
}) => {
  const lockerId = await addFolder(request, "Edit Lock Parent", {
    allowedTypes: ["posts"],
    lockSubfolderTypes: true,
  });
  const childId = await addFolder(request, "Edit Lock Child", { parent: lockerId });
  const freeId = await addFolder(request, "Edit Free Folder");

  await page.goto(`/admin/collections/folders/${childId}`);
  await expect(page.getByTestId("types-locked-note")).toHaveText(
    "Locked by Edit Lock Parent: this folder takes its page types from it"
  );
  // The stock select and checkbox are there, and cannot be changed.
  await expect(page.locator("#field-allowedTypes .rs__control--is-disabled")).toBeVisible();
  await expect(page.locator("#field-defaultType .rs__control--is-disabled")).toBeVisible();
  await expect(page.locator("#field-lockSubfolderTypes")).toBeDisabled();

  await page.goto(`/admin/collections/folders/${freeId}`);
  await expect(page.locator("#field-allowedTypes")).toBeVisible();
  await expect(page.getByTestId("types-locked-note")).toHaveCount(0);
  await expect(page.locator("#field-allowedTypes .rs__control--is-disabled")).toHaveCount(0);
  await expect(page.locator("#field-lockSubfolderTypes")).toBeEnabled();
});

test("the folders edit view saves a rename only after asking with the URL count", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Edit Rename Folder");
  await createPage(request, { folder: folderId, slug: "inside", title: "Inside Page" });
  await page.goto(`/admin/collections/folders/${folderId}`);

  await page.locator("#field-slug").fill("edit-renamed");
  await page.getByRole("button", { name: "Save" }).click();

  const dialog = confirmDialog(page);
  await expect(dialog.getByTestId("url-change-summary")).toContainText(
    "1 published URL will change"
  );
  expect(await readFolderSlug(request, folderId)).toBe("edit-rename-folder");
  await dialog.getByRole("button", { exact: true, name: "Rename" }).click();
  await expect(page.getByText("Updated successfully")).toBeVisible();
  await page.reload();
  expect(await readFolderSlug(request, folderId)).toBe("edit-renamed");
  expect((await childrenOf(request, folderId)).map((row) => row.fullPath)).toEqual([
    "/edit-renamed/inside",
  ]);
});

test("a folder with no name in this language shows its default-language name as the heading", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Only English Folder");

  try {
    await page.goto(`/admin/collections/folders/${folderId}?locale=de`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Only English Folder");
  } finally {
    // Payload remembers the admin locale per user, and every later spec reads English.
    await page.goto(`/admin/collections/folders/${folderId}?locale=en`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Only English Folder");
  }
});

test("folder settings checks the segment against the picked parent before it writes anything", async ({
  page,
  request,
}) => {
  const targetId = await addFolder(request, "Clash Target");
  const sourceId = await addFolder(request, "Clash Source");
  // The target already has a subfolder with the segment the mover has.
  await createFolder(request, {
    name: "Clash Twin",
    parent: targetId,
    slug: "clash-mover",
  });
  const moverId = await createFolder(request, {
    name: "Clash Mover",
    parent: sourceId,
    slug: "clash-mover",
  });
  await openContentTree(page);
  await expandFolder(page, "Clash Source");
  await openRowMenu(folderRow(page, "Clash Mover"));
  await menuItem(page, "Settings").click();
  const form = folderSettings(page);
  await expect(form.getByTestId("settings-full-url")).toHaveText("/clash-source/clash-mover");

  await form.getByTestId("name-input").fill("Clash Mover Renamed");
  await form.getByTestId("parent-change").click();
  await form
    .getByTestId("parent-picker")
    .getByRole("treeitem", { name: /Clash Target/u })
    .click();

  // The unchanged segment is checked in the new parent, and the clash keeps Save off: a rename
  // that saved first and met the clash in the move would be half done.
  await expect(form.getByTestId("segment-status")).toHaveText(
    "/clash-target/clash-mover is already used by a folder"
  );
  await expect(form.getByRole("button", { exact: true, name: "Save" })).toBeDisabled();
  const stored = await request.get(`/api/folders/${moverId}?depth=0`);
  expect(await stored.json()).toMatchObject({ name: "Clash Mover", parent: sourceId });

  // The Full URL and the segment's folder follow the picked parent before anything is saved.
  await expect(form.getByTestId("settings-full-url")).toHaveText("/clash-target/clash-mover");
  await form.getByTestId("segment-input").fill("clash-free");
  await expect(form.getByTestId("segment-status")).toHaveAttribute("data-state", "ok");
  await expect(form.getByTestId("segment-status")).toContainText("/clash-target/clash-free");
  await expect(form.getByTestId("settings-full-url")).toHaveText("/clash-target/clash-free");
  await expect(form.getByRole("button", { exact: true, name: "Save" })).toBeEnabled();
});

test("page settings checks the segment against the picked parent before it writes anything", async ({
  page,
  request,
}) => {
  const targetId = await addFolder(request, "Dup Target");
  const sourceId = await addFolder(request, "Dup Source");
  await createPage(request, { folder: targetId, slug: "dup", title: "Dup Resident" });
  const moverId = await createPage(request, { folder: sourceId, slug: "dup", title: "Dup Mover" });
  await openContentTree(page);
  await expandFolder(page, "Dup Source");
  await openRowMenu(pageRow(page, "Dup Mover"));
  await menuItem(page, "Settings").click();
  const form = pageSettings(page);

  await form.getByTestId("title-input").fill("Dup Mover Renamed");
  await form.getByTestId("parent-change").click();
  await form
    .getByTestId("parent-picker")
    .getByRole("treeitem", { name: /Dup Target/u })
    .click();

  await expect(form.getByTestId("segment-status")).toHaveText(
    "/dup-target/dup is already used by Dup Resident"
  );
  await expect(form.getByRole("button", { exact: true, name: "Save" })).toBeDisabled();
  // Nothing was written: the title edit would have been a draft ahead of the refused move.
  expect(await readPage(request, moverId, { draft: true })).toMatchObject({ title: "Dup Mover" });
});

test("the folders edit view does not save a lock it could not count the subfolders of", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Uncounted Lock");
  const childId = await createFolder(request, {
    name: "Uncounted Child",
    parent: folderId,
    slug: "uncounted-child",
  });
  await page.goto(`/admin/collections/folders/${folderId}`);
  // The count is a read of the folders list; refused, there is no number to confirm.
  await page.route(/\/api\/folders\?.*ancestorIds/u, (route) => route.abort());

  await page.locator("#field-allowedTypes").click();
  await page.getByRole("option", { name: "Blog post" }).click();
  await page.locator("#field-lockSubfolderTypes").check();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByText("Could not count the subfolders this lock reaches, so nothing was saved.")
  ).toBeVisible();
  const stored = await request.get(`/api/folders/${folderId}?depth=0`);
  expect(await stored.json()).toMatchObject({ lockSubfolderTypes: false });
  const child = await request.get(`/api/folders/${childId}?depth=0`);
  expect(((await child.json()) as { allowedTypes?: string[] }).allowedTypes ?? []).toEqual([]);
});

test("page settings keeps a root flag a draft when the page changed since it was read", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Stale Drawer Folder");
  const pageId = await createPage(request, {
    folder: folderId,
    slug: "stale-drawer",
    title: "Stale Drawer Page",
  });
  await openContentTree(page);
  await expandFolder(page, "Stale Drawer Folder");
  await openRowMenu(pageRow(page, "Stale Drawer Page"));
  await menuItem(page, "Settings").click();
  const form = pageSettings(page);
  await expect(form.getByTestId("title-input")).toHaveValue("Stale Drawer Page");

  await form.getByRole("checkbox", { name: "Folder root page" }).click();
  await form.getByRole("button", { exact: true, name: "Save" }).click();
  // The confirmation is open, so the drawer has read the page. A draft saved now is news to it.
  const dialog = confirmDialog(page);
  await expect(dialog.getByTestId("url-samples")).toContainText("becomes /stale-drawer-folder");
  const draftSave = await request.patch(`/api/pages/${pageId}?draft=true&depth=0`, {
    data: { _status: "draft", title: "Stale Drawer Unreviewed" },
  });
  expect(draftSave.ok()).toBe(true);
  await dialog.getByRole("button", { exact: true, name: "Set as root page" }).click();

  // The server refused the live save, and nothing went live.
  await expect(form.getByTestId("settings-failure")).toContainText(
    "This page changed since it was read"
  );
  expect(await readPage(request, pageId)).toMatchObject({
    isFolderRoot: false,
    title: "Stale Drawer Page",
  });

  // Saved as a draft instead, the flag rides on the draft and the live page stays as it was.
  await form.getByTestId("save-as-draft-instead").click();
  await expect(form).toBeHidden();
  expect(await readPage(request, pageId)).toMatchObject({
    isFolderRoot: false,
    title: "Stale Drawer Page",
  });
  expect(await readPage(request, pageId, { draft: true })).toMatchObject({
    _status: "draft",
    isFolderRoot: true,
    title: "Stale Drawer Unreviewed",
  });
});

/**
 * Lets the page's first live save through only after a draft has been saved behind the editor's
 * back, the race the version precondition exists for. Returns when the draft is in.
 */
const saveDraftBeforeLiveSave = async (
  page: import("@playwright/test").Page,
  request: APIRequestContext,
  pageId: number,
  title: string
): Promise<void> => {
  let isInjected = false;
  await page.route(`**/api/pages/${pageId}?*`, async (route) => {
    const sent = route.request();
    if (!isInjected && sent.method() === "PATCH" && sent.url().includes("frFoldersIfUpdatedAt")) {
      isInjected = true;
      const saved = await request.patch(`/api/pages/${pageId}?draft=true&depth=0`, {
        data: { _status: "draft", title },
      });
      expect(saved.ok()).toBe(true);
    }
    await route.continue();
  });
};

test("Set as root page offers Save as draft instead when a draft lands in the round trip, and the toast reads in full", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Race Root Folder");
  const pageId = await createPage(request, {
    folder: folderId,
    slug: "race-root",
    title: "Race Root Page",
  });
  await openContentTree(page);
  await expandFolder(page, "Race Root Folder");
  await saveDraftBeforeLiveSave(page, request, pageId, "Race Root Unreviewed");
  await openRowMenu(pageRow(page, "Race Root Page"));
  await menuItem(page, "Set as root page").click();
  await confirmDialog(page).getByRole("button", { exact: true, name: "Set as root page" }).click();

  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "This page changed" });
  await expect(toast).toBeVisible();
  expect(await readPage(request, pageId)).toMatchObject({ isFolderRoot: false });
  // The action sits under the message, which keeps the full width of the toast.
  const message = toast.locator("[data-title]");
  const action = toast.getByRole("button", { name: "Save as draft instead" });
  const messageBox = await message.boundingBox();
  const actionBox = await action.boundingBox();
  expect(messageBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(messageBox?.width ?? 0).toBeGreaterThan(200);
  expect(actionBox?.y ?? 0).toBeGreaterThan((messageBox?.y ?? 0) + (messageBox?.height ?? 0) - 2);

  await action.click();
  await expect(
    page.getByText(
      '"Race Root Page" becomes the root page of /race-root-folder when it is published'
    )
  ).toBeVisible();
  expect(await readPage(request, pageId, { draft: true })).toMatchObject({
    _status: "draft",
    isFolderRoot: true,
    title: "Race Root Unreviewed",
  });
  expect(await readPage(request, pageId)).toMatchObject({ isFolderRoot: false });
});

test("Unset root page offers Save as draft instead when a draft lands in the round trip", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Race Unroot Folder");
  const pageId = (
    (await (
      await request.post("/api/pages", {
        data: {
          _status: "published",
          folder: folderId,
          isFolderRoot: true,
          slug: "race-unroot",
          title: "Race Unroot Page",
        },
      })
    ).json()) as { doc: { id: number } }
  ).doc.id;
  await openContentTree(page);
  await expandFolder(page, "Race Unroot Folder");
  await saveDraftBeforeLiveSave(page, request, pageId, "Race Unroot Unreviewed");
  await openRowMenu(pageRow(page, "Race Unroot Page"));
  await menuItem(page, "Unset root page").click();
  await unrootDialog(page).getByRole("button", { exact: true, name: "Unset root page" }).click();

  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "This page changed" });
  await expect(toast).toBeVisible();
  expect(await readPage(request, pageId)).toMatchObject({ isFolderRoot: true });

  await toast.getByRole("button", { name: "Save as draft instead" }).click();
  await expect(
    page.getByText('"Race Unroot Page" stops being the root page when it is published')
  ).toBeVisible();
  expect(await readPage(request, pageId, { draft: true })).toMatchObject({
    _status: "draft",
    isFolderRoot: false,
    slug: "race-unroot",
    title: "Race Unroot Unreviewed",
  });
  expect(await readPage(request, pageId)).toMatchObject({ isFolderRoot: true });
});
