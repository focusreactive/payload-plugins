import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

import { childrenOf, createFolder } from "./helpers/content.js";
import { menuItem, openRowMenu } from "./helpers/menu.js";
import { expandFolder, folderRow, openContentTree, pageRow } from "./helpers/tree.js";

// Every test works in a folder of its own, removed afterwards with everything the test made in it,
// so the seeded tree the other specs read is never changed.
const createdFolders: number[] = [];

const removeFolderTree = async (request: APIRequestContext, folderId: number): Promise<void> => {
  for (const row of await childrenOf(request, folderId)) {
    if (row.kind === "folder") {
      await removeFolderTree(request, row.id);
    } else {
      await request.delete(`/api/${row.collection}/${row.id}`);
    }
  }
  await request.delete(`/api/folders/${folderId}`);
};

test.afterEach(async ({ request }) => {
  for (const id of createdFolders.splice(0).toReversed()) {
    await removeFolderTree(request, id);
  }
});

const addFolder = async (request: APIRequestContext, name: string): Promise<number> => {
  const id = await createFolder(request, { name, slug: name.toLowerCase().replaceAll(" ", "-") });
  createdFolders.push(id);

  return id;
};

const folderDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("create-folder-form") });

const pageDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("create-page-form") });

const createButton = (dialog: Locator): Locator =>
  dialog.getByRole("button", { exact: true, name: "Create" });

/** Opens "Create folder here" or an entry of "Create page here" from a folder's context menu. */
const startFolderIn = async (page: Page, folderTitle: string): Promise<Locator> => {
  await openRowMenu(folderRow(page, folderTitle));
  await menuItem(page, "Create folder here").click();
  const dialog = folderDialog(page);
  await expect(dialog).toBeVisible();

  return dialog;
};

const startPageIn = async (
  page: Page,
  folderTitle: string,
  typeLabel: string
): Promise<Locator> => {
  await openRowMenu(folderRow(page, folderTitle));
  await menuItem(page, "Create page here").click();
  await page.getByTestId("context-submenu").getByRole("menuitem", { name: typeLabel }).click();
  const dialog = pageDialog(page);
  await expect(dialog).toBeVisible();

  return dialog;
};

test("New folder derives the segment from the name", async ({ page, request }) => {
  const parentId = await addFolder(request, "Create Probe Parent");
  await openContentTree(page);
  const dialog = await startFolderIn(page, "Create Probe Parent");

  // The first field has the focus, not the dialog's heading.
  await expect(dialog.getByTestId("name-input")).toBeFocused();
  // The parent is the folder the menu was opened on, and the segment follows the name.
  await expect(dialog.getByTestId("parent-name")).toHaveText("Create Probe Parent");
  const segment = dialog.getByTestId("segment-input");
  await dialog.getByTestId("name-input").fill("Quarterly Reports");
  await expect(segment).toHaveValue("quarterly-reports");
  await expect(dialog.getByTestId("segment-status")).toHaveText(
    "Free: /create-probe-parent/quarterly-reports"
  );
  await expect(createButton(dialog)).toBeEnabled();

  // Typing in the segment ends the following; the link icon starts it again.
  await segment.fill("reports-2026");
  await dialog.getByTestId("name-input").fill("Quarterly Reports Archive");
  await expect(segment).toHaveValue("reports-2026");
  await dialog.getByTestId("segment-link").click();
  await expect(segment).toHaveValue("quarterly-reports-archive");

  await createButton(dialog).click();

  // The folder is made live, lands on top of its parent, which opens, and has the focus.
  const created = folderRow(page, "Quarterly Reports Archive");
  await expect(created).toBeVisible();
  await expect(created).toBeFocused();
  await expect(created.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
    "data-title",
    "Create Probe Parent"
  );
  await page.reload();
  const inParent = await childrenOf(request, parentId);
  expect(inParent.map((row) => [row.title, row.fullPath])).toEqual([
    ["Quarterly Reports Archive", "/create-probe-parent/quarterly-reports-archive"],
  ]);
});

test("Create stays disabled for a taken segment", async ({ page }) => {
  await openContentTree(page);
  const dialog = await startFolderIn(page, "Blog");

  // /blog/hello-world is the seeded page "Hello World".
  await dialog.getByTestId("name-input").fill("Hello World");
  await expect(dialog.getByTestId("segment-input")).toHaveValue("hello-world");
  await expect(dialog.getByTestId("segment-status")).toHaveText(
    "/blog/hello-world is already used by Hello World"
  );
  // Every error in the dialogs is in the danger colour, this one as well as the failure line.
  const colours = await dialog.getByTestId("segment-status").evaluate((status) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--color-text-danger)";
    document.body.append(probe);
    const danger = getComputedStyle(probe).color;
    probe.remove();

    return { danger, status: getComputedStyle(status).color };
  });
  expect(colours.status).toBe(colours.danger);
  await expect(createButton(dialog)).toBeDisabled();

  // A free segment turns it on, and a malformed one turns it off without asking the server.
  await dialog.getByTestId("segment-input").fill("hello-again");
  await expect(dialog.getByTestId("segment-status")).toHaveText("Free: /blog/hello-again");
  await expect(createButton(dialog)).toBeEnabled();
  await dialog.getByTestId("segment-input").fill("Not A Segment");
  await expect(dialog.getByTestId("segment-status")).toContainText(
    "Use lowercase letters, numbers, hyphens, underscores or dots"
  );
  await expect(createButton(dialog)).toBeDisabled();
  // An empty name keeps it off too.
  await dialog.getByTestId("segment-input").fill("hello-again");
  await dialog.getByTestId("name-input").fill("");
  await expect(createButton(dialog)).toBeDisabled();
});

test("inside blog/2026 only Article is offered", async ({ page }) => {
  await openContentTree(page);
  await expandFolder(page, "Blog");

  // The folder takes Blog posts only (the seed calls its second page type "Blog post").
  await openRowMenu(folderRow(page, "2026"));
  await menuItem(page, "Create page here").click();
  const submenu = page.getByTestId("context-submenu");
  await expect(submenu.getByRole("menuitem")).toHaveText(["Blog postdefault"]);
  await page.keyboard.press("Escape");

  const dialog = await startPageIn(page, "2026", "Blog post");
  const type = dialog.getByTestId("page-type");
  await expect(type.locator("option")).toHaveText(["Blog post (default)"]);
  await expect(type).toBeDisabled();
});

test("New page creates a draft and opens the editor", async ({ page, request }) => {
  const folderId = await addFolder(request, "Draft Probe Folder");
  await openContentTree(page);
  const dialog = await startPageIn(page, "Draft Probe Folder", "Page");

  await expect(dialog.getByTestId("title-input")).toBeFocused();
  await dialog.getByTestId("title-input").fill("Fresh Draft Probe");
  await expect(dialog.getByTestId("segment-input")).toHaveValue("fresh-draft-probe");
  await expect(createButton(dialog)).toBeEnabled();
  await createButton(dialog).click();

  await expect(page).toHaveURL(/\/admin\/collections\/pages\/\d+/u);
  const id = page.url().match(/\/pages\/(\d+)/u)?.[1];
  expect(id).toBeDefined();
  const saved = await request.get(`/api/pages/${id}?draft=true&depth=0`);
  expect(await saved.json()).toMatchObject({
    _status: "draft",
    folder: folderId,
    isFolderRoot: false,
    slug: "fresh-draft-probe",
    title: "Fresh Draft Probe",
  });
});

test("a posts page opens the prefilled drawer", async ({ page, request }) => {
  const folderId = await addFolder(request, "Drawer Probe Folder");
  await openContentTree(page);
  const dialog = await startPageIn(page, "Drawer Probe Folder", "Blog post");

  await dialog.getByTestId("title-input").fill("Drawer Probe Post");
  await expect(dialog.getByTestId("segment-input")).toHaveValue("drawer-probe-post");
  await createButton(dialog).click();

  // Posts have no drafts, so the collection's own form opens with the values filled in.
  const drawer = page.locator(".doc-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.locator("#field-title")).toHaveValue("Drawer Probe Post");
  await expect(drawer.locator("#field-slug")).toHaveValue("drawer-probe-post");
  expect(await childrenOf(request, folderId)).toEqual([]);

  const treeUrl = page.url();
  await drawer.getByRole("button", { name: "Save", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  // Saving did not take the editor away from the tree. Payload's redirect after a create starts
  // when the save answers, so let the page settle before looking at the address.
  await expandFolder(page, "Drawer Probe Folder");
  await expect(pageRow(page, "Drawer Probe Post")).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(page.url()).toBe(treeUrl);
  await expect(page.getByRole("treegrid")).toBeVisible();
  const inFolder = await childrenOf(request, folderId);
  expect(inFolder.map((row) => [row.collection, row.title, row.fullPath])).toEqual([
    ["posts", "Drawer Probe Post", "/drawer-probe-folder/drawer-probe-post"],
  ]);
});

test("a refused draft opens the prefilled drawer, and any other failure stays in the dialog", async ({
  page,
  request,
}) => {
  await addFolder(request, "Refused Draft Probe");
  let answer: { body: unknown; status: number } = {
    body: {
      errors: [
        {
          data: { errors: [{ message: "This field is required.", path: "blocks" }] },
          message: "The following field is invalid: blocks",
        },
      ],
    },
    status: 400,
  };
  await page.route(
    (url) => url.pathname === "/api/pages" && url.searchParams.get("draft") === "true",
    (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            body: JSON.stringify(answer.body),
            contentType: "application/json",
            status: answer.status,
          })
        : route.continue()
  );
  await openContentTree(page);
  const dialog = await startPageIn(page, "Refused Draft Probe", "Page");
  await dialog.getByTestId("title-input").fill("Refused Draft Page");
  await createButton(dialog).click();

  // A validation refusal of the draft hands the same four values to the collection's own form.
  const drawer = page.locator(".doc-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.locator("#field-title")).toHaveValue("Refused Draft Page");
  await expect(drawer.locator("#field-slug")).toHaveValue("refused-draft-page");
  await expect(pageDialog(page)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);

  // A server failure is not the form's to fix: the dialog stays, with the message, to try again.
  answer = { body: { errors: [{ message: "The database is away" }] }, status: 500 };
  // A new title: the drawer's autosave already saved the first page, and its segment is taken.
  const again = await startPageIn(page, "Refused Draft Probe", "Page");
  await again.getByTestId("title-input").fill("Failed Server Page");
  await createButton(again).click();
  await expect(again.getByTestId("create-failure")).toHaveText("The database is away");
  await expect(page.locator(".doc-drawer")).toHaveCount(0);
});

test("the root checkbox is disabled where a root exists", async ({ page, request }) => {
  await openContentTree(page);
  const dialog = await startPageIn(page, "Company", "Page");

  // Company's own root page is About Us.
  const checkbox = dialog.getByRole("checkbox", { name: "Folder root page" });
  await expect(checkbox).toBeDisabled();
  await expect(dialog.getByTestId("root-taken")).toHaveText("About Us is already the root page");
  await page.keyboard.press("Escape");
  await expect(pageDialog(page)).toHaveCount(0);

  // A folder without one offers it, and ticking it greys out the segment that no URL uses.
  const folderId = await addFolder(request, "Root Probe Folder");
  await page.reload();
  const open = await startPageIn(page, "Root Probe Folder", "Page");
  const rootBox = open.getByRole("checkbox", { name: "Folder root page" });
  await expect(rootBox).toBeEnabled();
  await open.getByTestId("title-input").fill("Probe Landing");
  await rootBox.check();
  await expect(open.getByTestId("segment-input")).toBeDisabled();
  await createButton(open).click();

  await expect(page).toHaveURL(/\/admin\/collections\/pages\/\d+/u);
  const id = page.url().match(/\/pages\/(\d+)/u)?.[1];
  const saved = await request.get(`/api/pages/${id}?draft=true&depth=0`);
  expect(await saved.json()).toMatchObject({ folder: folderId, isFolderRoot: true });
});

test("the parent folder can be changed with the folder picker", async ({ page, request }) => {
  const firstId = await addFolder(request, "Picker Probe One");
  const secondId = await addFolder(request, "Picker Probe Two");
  await openContentTree(page);
  const dialog = await startFolderIn(page, "Picker Probe One");
  await expect(dialog.getByTestId("parent-name")).toHaveText("Picker Probe One");

  await dialog.getByTestId("parent-change").click();
  await dialog
    .getByTestId("parent-picker")
    .locator('[data-testid="picker-row"][data-title="Picker Probe Two"]')
    .click();
  await expect(dialog.getByTestId("parent-name")).toHaveText("Picker Probe Two");
  await dialog.getByTestId("name-input").fill("Moved Parent Probe");
  await expect(createButton(dialog)).toBeEnabled();
  await createButton(dialog).click();

  await expect(folderRow(page, "Moved Parent Probe")).toBeVisible();
  await page.reload();
  expect(await childrenOf(request, firstId)).toEqual([]);
  expect((await childrenOf(request, secondId)).map((row) => row.title)).toEqual([
    "Moved Parent Probe",
  ]);
});

test("a folder made with specific page types keeps them, and the lock reaches its subfolders", async ({
  page,
  request,
}) => {
  const parentId = await addFolder(request, "Types Probe Parent");
  await openContentTree(page);
  const dialog = await startFolderIn(page, "Types Probe Parent");

  await dialog.getByTestId("name-input").fill("Posts Only Probe");
  await dialog.getByRole("radio", { name: "Specific types" }).check();
  // Nothing chosen yet: Create waits, and says why.
  await expect(dialog.getByTestId("types-needed")).toBeVisible();
  await expect(createButton(dialog)).toBeDisabled();
  await dialog.getByTestId("type-chips").getByRole("checkbox", { name: "Blog post" }).click();
  await expect(createButton(dialog)).toBeEnabled();
  await expect(dialog.getByTestId("default-type").locator("option")).toHaveText([
    "No default",
    "Blog post",
  ]);
  await dialog.getByRole("checkbox", { name: "Lock subfolders' page types" }).check();
  await createButton(dialog).click();
  await expect(folderRow(page, "Posts Only Probe")).toBeVisible();

  const [created] = await childrenOf(request, parentId);
  expect(created).toMatchObject({ allowedTypes: ["posts"], title: "Posts Only Probe" });
  const stored = await request.get(`/api/folders/${created?.id}?depth=0`);
  expect(await stored.json()).toMatchObject({
    allowedTypes: ["posts"],
    defaultType: "posts",
    lockSubfolderTypes: true,
  });

  // A subfolder made inside it takes the locked types, and its dialog says so.
  const nested = await startFolderIn(page, "Posts Only Probe");
  await expect(nested.getByTestId("types-locked")).toBeVisible();
  await expect(nested.getByRole("radio", { name: "Specific types" })).toBeDisabled();
  await nested.getByTestId("name-input").fill("Nested Probe");
  await createButton(nested).click();
  await expect(folderRow(page, "Nested Probe")).toBeVisible();
  const [nestedRow] = await childrenOf(request, created?.id ?? 0);
  expect(nestedRow).toMatchObject({ allowedTypes: ["posts"], title: "Nested Probe" });
});

test("the Create button offers Folder and every page type at the top level", async ({ page }) => {
  await openContentTree(page);
  await page.getByTestId("create-button").click();

  await expect(page.getByTestId("create-menu").getByRole("menuitem")).toHaveText([
    "Folder",
    "Page",
    "Blog post",
  ]);
  await page.getByTestId("create-menu").getByRole("menuitem", { name: "Folder" }).click();
  const dialog = folderDialog(page);
  await expect(dialog.getByTestId("parent-name")).toHaveText("Content (top level)");
  await page.keyboard.press("Escape");
  await expect(folderDialog(page)).toHaveCount(0);
  await expect(pageRow(page, "Home")).toBeVisible();
});
