import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

import {
  childrenOf,
  createFolder,
  createPage,
  readPage,
  redirectsFrom,
  removeFolderTree,
} from "./helpers/content.js";
import { folderRow, rowNamesAtLevel } from "./helpers/tree.js";

// Every test works in a folder of its own, removed afterwards with what is inside, so the seeded
// tree the other specs read stays as it is (and the seeded pages are never autosaved).
const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  for (const id of createdFolders.splice(0).toReversed()) {
    await removeFolderTree(request, id);
  }
});

const addFolder = async (
  request: APIRequestContext,
  name: string,
  parent?: number
): Promise<number> => {
  const id = await createFolder(request, {
    name,
    parent,
    slug: name.toLowerCase().replaceAll(" ", "-"),
  });
  createdFolders.push(id);

  return id;
};

const openEditView = async (page: Page, collection: string, id: number): Promise<void> => {
  await page.goto(`/admin/collections/${collection}/${id}`);
  await page.getByTestId("folder-location").waitFor();
};

const segmentInput = (page: Page) => page.locator("#field-slug");

test("the location breadcrumb links to the zoomed tree", async ({ page, request }) => {
  // Blog > 2026 > New Year is in the seed; nothing here changes it.
  const blogId = (await childrenOf(request, "root")).find((row) => row.title === "Blog")?.id;
  const yearId = (await childrenOf(request, blogId as number)).find(
    (row) => row.title === "2026"
  )?.id;
  const newYear = (await childrenOf(request, yearId as number)).find(
    (row) => row.title === "New Year"
  );
  await openEditView(page, "posts", newYear?.id as number);

  const crumbs = page.getByTestId("location-crumbs").getByRole("link");
  await expect(crumbs).toHaveText(["Content", "Blog", "2026"]);
  await expect(crumbs.nth(2)).toHaveAttribute(
    "href",
    new RegExp(`/admin/collections/folders\\?folder=${yearId}$`, "u")
  );

  // The crumb leads to the tree with Blog open and the 2026 row focused. Zooming is P-35's.
  await crumbs.nth(2).click();
  // Payload adds its own list parameters after the folder.
  await expect(page).toHaveURL(
    new RegExp(`/admin/collections/folders\\?folder=${yearId}(&|$)`, "u")
  );
  await expect(page.getByRole("treegrid")).toBeVisible();
  await expect(folderRow(page, "Blog")).toHaveAttribute("aria-expanded", "true");
  await expect(folderRow(page, "2026")).toBeVisible();
  await expect(folderRow(page, "2026")).toBeFocused();
  await expect(rowNamesAtLevel(page, 2).filter({ hasText: "2026" })).toHaveCount(1);
});

test("unticking root always opens the dialog pre-filled with the stored slug", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Root Fields Folder");
  const rootId = (
    (await (
      await request.post("/api/pages", {
        data: {
          _status: "published",
          folder: folderId,
          isFolderRoot: true,
          slug: "start-here",
          title: "Root Fields Landing",
        },
      })
    ).json()) as { doc: { id: number } }
  ).doc.id;
  await openEditView(page, "pages", rootId);

  const checkbox = page.getByTestId("folder-root-field").getByRole("checkbox");
  await expect(checkbox).toBeChecked();
  await expect(page.getByTestId("root-tooltip")).toContainText("Example /posts for an overview");
  await expect(page.getByTestId("root-path")).toContainText("/root-fields-folder");
  // Ticked greys the segment field: it cannot be focused or typed in.
  const segmentField = page.locator(".field-type", { has: segmentInput(page) });
  await expect(segmentField).toHaveAttribute("data-fr-folders-greyed", "true");
  await expect(segmentField).toHaveAttribute("inert", "");

  // The stored segment is valid and free, and the dialog still opens, with it filled in.
  await checkbox.click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByTestId("unroot-form") });
  await expect(
    dialog.getByRole("heading", { name: "Choose this page's own URL segment" })
  ).toBeVisible();
  await expect(dialog.getByTestId("segment-input")).toHaveValue("start-here");
  await expect(dialog.getByTestId("unroot-url")).toHaveText(
    "The page's URL becomes /root-fields-folder/start-here"
  );

  // Cancel leaves the page a root page; nothing was written.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(checkbox).toBeChecked();
  await page.reload();
  expect(await readPage(request, rootId)).toMatchObject({ isFolderRoot: true });

  // Confirming puts the segment and the unticked box into the form, for the stock Save to apply.
  await openEditView(page, "pages", rootId);
  await checkbox.click();
  await dialog.getByTestId("segment-input").fill("front-door");
  await expect(dialog.getByTestId("segment-status")).toHaveAttribute("data-state", "ok");
  await dialog.getByRole("button", { exact: true, name: "Unset root page" }).click();
  await expect(checkbox).not.toBeChecked();
  await expect(segmentField).not.toHaveAttribute("inert", "");
  await expect(segmentInput(page)).toHaveValue("front-door");
  await page.getByRole("button", { name: "Publish in en" }).click();
  await expect(page.getByText("Updated successfully")).toBeVisible();
  await page.reload();
  expect(await readPage(request, rootId)).toMatchObject({
    isFolderRoot: false,
    slug: "front-door",
  });
  expect((await childrenOf(request, folderId)).map((row) => row.fullPath)).toEqual([
    "/root-fields-folder/front-door",
  ]);
});

/** A published root page of a folder, made through the REST API. */
const createRootPage = async (
  request: APIRequestContext,
  data: { folder: number; slug: string; title: string }
): Promise<number> => {
  const response = await request.post("/api/pages", {
    data: { _status: "published", isFolderRoot: true, ...data },
  });
  expect(response.ok()).toBe(true);

  return ((await response.json()) as { doc: { id: number } }).doc.id;
};

test("the segment chosen in the un-root dialog survives slow form-state round trips", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Slow State Folder");
  const rootId = await createRootPage(request, {
    folder: folderId,
    slug: "start-here",
    title: "Slow State Landing",
  });
  // The form-state requests are server actions posted to the edit view's URL. Held back, one that
  // was sent before the dialog closed comes back after it, which used to put the stored segment back.
  await page.route("**/admin/collections/pages/**", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    await route.continue();
  });
  await openEditView(page, "pages", rootId);

  const checkbox = page.getByTestId("folder-root-field").getByRole("checkbox");
  await checkbox.click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByTestId("unroot-form") });
  await dialog.getByTestId("segment-input").fill("front-door");
  await expect(dialog.getByTestId("segment-status")).toHaveAttribute("data-state", "ok");
  await dialog.getByRole("button", { exact: true, name: "Unset root page" }).click();

  await expect(checkbox).not.toBeChecked();
  await expect(segmentInput(page)).toHaveValue("front-door");
  // The round trips that were in flight have all landed by now.
  await page.waitForTimeout(4000);
  await expect(segmentInput(page)).toHaveValue("front-door");
  await expect(checkbox).not.toBeChecked();
  await page.getByRole("button", { name: "Publish in en" }).click();
  await expect(page.getByText("Updated successfully")).toBeVisible();
  expect(await readPage(request, rootId)).toMatchObject({
    isFolderRoot: false,
    slug: "front-door",
  });
});

test("unticking root waits for the page's folder to be known, so the dialog never asks about the top level", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Located Root Folder");
  const rootId = await createRootPage(request, {
    folder: folderId,
    slug: "locate-me",
    title: "Located Root Page",
  });
  // The folder comes from the ancestors request; held back, the box starts out with no location.
  await page.route("**/api/folders-tree/ancestors*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });
  await page.goto(`/admin/collections/pages/${rootId}`);

  const checkbox = page.getByTestId("folder-root-field").getByRole("checkbox");
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeDisabled();
  // Once the location is known the box works, and the dialog names the page's own folder.
  await expect(checkbox).toBeEnabled();
  await checkbox.click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByTestId("unroot-form") });
  await expect(dialog.getByTestId("unroot-url")).toHaveText(
    "The page's URL becomes /located-root-folder/locate-me"
  );
});

test("a draft that ticks root over a folder that already has a root page shows the warning", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Root Clash Folder");
  await createRootPage(request, { folder: folderId, slug: "alpha-root", title: "Alpha Root" });
  const draftId = await createPage(request, {
    folder: folderId,
    slug: "beta-draft",
    status: "draft",
    title: "Beta Draft",
  });
  // A draft save passes the root page rule (decision 10): the warning is the edit view's job.
  const saved = await request.patch(`/api/pages/${draftId}?draft=true&depth=0`, {
    data: { _status: "draft", isFolderRoot: true },
  });
  expect(saved.ok()).toBe(true);

  await openEditView(page, "pages", draftId);

  await expect(page.getByTestId("folder-root-field").getByRole("checkbox")).toBeChecked();
  await expect(page.getByTestId("draft-root-conflict")).toHaveText(
    "Alpha Root is already the root page of /root-clash-folder; publishing this page as the root page will fail until that is unset."
  );
});

test("the root checkbox is disabled, with the name of the page that already is the folder's root", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Taken Root Folder");
  await createRootPage(request, { folder: folderId, slug: "gamma-root", title: "Gamma Root" });
  const otherId = await createPage(request, {
    folder: folderId,
    slug: "delta-page",
    title: "Delta Page",
  });

  await openEditView(page, "pages", otherId);

  const field = page.getByTestId("folder-root-field");
  await expect(field.getByTestId("root-taken")).toHaveText("Gamma Root is already the root page");
  await expect(field.getByRole("checkbox")).toBeDisabled();
});

test("a refused publish of the root flag shows the server's reason under the checkbox", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Refused Root Folder");
  const otherId = await createPage(request, {
    folder: folderId,
    slug: "epsilon-page",
    title: "Epsilon Page",
  });
  const rootChecked = page.waitForResponse((response) =>
    response.url().includes("/api/folders-tree/check-root")
  );
  await openEditView(page, "pages", otherId);
  await rootChecked;
  const checkbox = page.getByTestId("folder-root-field").getByRole("checkbox");
  await expect(checkbox).toBeEnabled();
  // Someone else makes another page the root page after this view loaded, so the box is still on offer.
  await createRootPage(request, { folder: folderId, slug: "zeta-root", title: "Zeta Root" });

  await checkbox.click();
  await page.getByRole("button", { name: "Publish in en" }).click();

  await expect(page.getByTestId("root-error")).toHaveText(
    "Zeta Root is already the root page of /refused-root-folder. Unset it first."
  );
  expect(await readPage(request, otherId)).toMatchObject({ isFolderRoot: false });
});

test("a page nobody has published says where it will be published", async ({ page, request }) => {
  const folderId = await addFolder(request, "Unpublished Hint Folder");
  const draftId = await createPage(request, {
    folder: folderId,
    slug: "not-yet",
    status: "draft",
    title: "Not Yet Page",
  });

  await openEditView(page, "pages", draftId);

  await expect(page.getByTestId("url-will-publish")).toHaveText(
    "Will be published at /unpublished-hint-folder/not-yet"
  );
  await expect(page.getByTestId("url-will-change")).toHaveCount(0);
  await segmentInput(page).fill("sooner-or-later");
  await expect(page.getByTestId("url-will-publish")).toHaveText(
    "Will be published at /unpublished-hint-folder/sooner-or-later"
  );
});

test("a segment that was autosaved as a draft still shows the change from the live URL after a reload", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Autosaved Hint Folder");
  const pageId = await createPage(request, {
    folder: folderId,
    slug: "live-name",
    title: "Autosaved Hint Page",
  });
  const saved = await request.patch(`/api/pages/${pageId}?draft=true&depth=0`, {
    data: { _status: "draft", slug: "draft-name" },
  });
  expect(saved.ok()).toBe(true);

  await openEditView(page, "pages", pageId);

  // The form loads with the draft's segment, so nothing is dirty; the page is still live at the old URL.
  await expect(segmentInput(page)).toHaveValue("draft-name");
  await expect(page.getByTestId("full-path")).toHaveText("/autosaved-hint-folder/live-name");
  await expect(page.getByTestId("url-will-change")).toHaveText(
    "URL will change from /autosaved-hint-folder/live-name to /autosaved-hint-folder/draft-name on publish"
  );
});

test("editing the slug shows the URL will change hint", async ({ page, request }) => {
  const folderId = await addFolder(request, "Hint Fields Folder");
  const pageId = await createPage(request, {
    folder: folderId,
    slug: "first-name",
    title: "Hint Fields Page",
  });
  await openEditView(page, "pages", pageId);
  await expect(page.getByTestId("full-path")).toHaveText("/hint-fields-folder/first-name");
  await expect(page.getByTestId("url-will-change")).toHaveCount(0);

  await segmentInput(page).fill("second-name");

  await expect(page.getByTestId("url-will-change")).toHaveText(
    "URL will change from /hint-fields-folder/first-name to /hint-fields-folder/second-name on publish"
  );
  // The stored path is unchanged until the page is published.
  await expect(page.getByTestId("full-path")).toHaveText("/hint-fields-folder/first-name");
  expect(await readPage(request, pageId)).toMatchObject({ slug: "first-name" });
});

test("URL history lists /about/contact", async ({ page, request }) => {
  // The seed renamed about to company, so the old path is made here: a folder `about` with a
  // published page `contact`, whose segment then changes and leaves a redirect from /about/contact.
  const folderId = await addFolder(request, "About");
  const pageId = await createPage(request, {
    folder: folderId,
    slug: "contact",
    title: "Contact Us",
  });
  const renamed = await request.patch(`/api/pages/${pageId}?depth=0`, {
    data: { _status: "published", slug: "contact-us" },
  });
  expect(renamed.ok()).toBe(true);
  expect(await redirectsFrom(request, "/about/contact")).toBeGreaterThan(0);

  await openEditView(page, "pages", pageId);
  const history = page.getByTestId("url-history");
  // Collapsed until opened; the old path has a row for each language the page is served in.
  await expect(history.getByTestId("url-history-summary")).toContainText(/URL history \(\d+\)/u);
  await expect(history.getByTestId("url-history-list")).toBeHidden();
  await history.getByTestId("url-history-summary").click();
  await expect(history.getByTestId("url-history-list")).toContainText("/about/contact");
});

test("a draft segment conflict shows the warning", async ({ page, request }) => {
  const folderId = await addFolder(request, "Conflict Folder");
  await createPage(request, { folder: folderId, slug: "taken-segment", title: "Taken Page" });
  const draftId = await createPage(request, {
    folder: folderId,
    slug: "free-segment",
    status: "draft",
    title: "Draft Page",
  });
  await openEditView(page, "pages", draftId);
  await expect(page.getByTestId("draft-conflict")).toHaveCount(0);

  await segmentInput(page).fill("taken-segment");

  await expect(page.getByTestId("draft-conflict")).toHaveText(
    "Another page already uses /conflict-folder/taken-segment; publishing will fail until one of them changes."
  );
  // The draft saves anyway (the autosave writes it): the warning is not an error (decision 10).
  await expect
    .poll(async () => (await readPage<{ slug: string }>(request, draftId, { draft: true })).slug)
    .toBe("taken-segment");

  // Clearing the clash clears the warning.
  await segmentInput(page).fill("free-segment");
  await expect(page.getByTestId("draft-conflict")).toHaveCount(0);
});

test("Move... moves the page and the breadcrumb and Full URL follow without a reload", async ({
  page,
  request,
}) => {
  const sourceId = await addFolder(request, "Edit Move Source");
  const targetId = await addFolder(request, "Edit Move Target");
  const pageId = await createPage(request, {
    folder: sourceId,
    slug: "mover",
    title: "Edit Mover",
  });
  await openEditView(page, "pages", pageId);
  const crumbs = page.getByTestId("location-crumbs").getByRole("link");
  await expect(crumbs).toHaveText(["Content", "Edit Move Source"]);
  await expect(page.getByTestId("full-path")).toHaveText("/edit-move-source/mover");

  await page.getByTestId("location-move").click();
  const picker = page.getByRole("dialog", { name: "Move 1 item to..." });
  await picker.getByRole("treeitem", { name: /Edit Move Target/u }).click();
  await picker.getByRole("button", { exact: true, name: "Move" }).click();
  // A published URL changes, so the move asks first.
  const confirm = page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });
  await expect(confirm.getByTestId("url-samples")).toContainText(
    "/edit-move-source/mover becomes /edit-move-target/mover"
  );
  await confirm.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 1 item")).toBeVisible();

  await expect(crumbs).toHaveText(["Content", "Edit Move Target"]);
  await expect(page.getByTestId("full-path")).toHaveText("/edit-move-target/mover");
  expect((await childrenOf(request, targetId)).map((row) => row.title)).toEqual(["Edit Mover"]);
  expect(await readPage(request, pageId)).toMatchObject({ folder: targetId });
});

test("a page that does not exist yet keeps the stock folder picker, so create still chooses a folder", async ({
  page,
}) => {
  // Blog posts have no autosave, so the form stays a create form (a page would save a draft at once).
  await page.goto("/admin/collections/posts/create");

  await expect(page.locator("#field-folder")).toBeVisible();
  await expect(page.getByTestId("folder-location")).toHaveCount(0);
  // The other fields have nothing to show before the first save.
  await expect(page.getByTestId("full-path-field")).toHaveCount(0);
  await expect(page.getByTestId("url-history")).toHaveCount(0);
  await expect(page.getByTestId("folder-root-field")).toBeVisible();
});
