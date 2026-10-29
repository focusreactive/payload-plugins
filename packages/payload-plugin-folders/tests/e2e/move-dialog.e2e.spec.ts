import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import {
  childrenOf,
  createFolder,
  createPage,
  deleteFolder,
  deletePage,
  redirectsFrom,
} from "./helpers/content.js";
import {
  expandFolder,
  folderRow,
  openContentTree,
  pageRow,
  rowCheckbox,
  toolbarButton,
} from "./helpers/tree.js";
import { startStockServer, stockServerUrl, stopStockServer } from "./helpers/stockServer.js";
import { signInAs } from "./helpers/users.js";

// The pages these tests move are their own, in two folders the tests create and remove, so the
// seeded tree that the other specs read is never touched.
let newsId = 0;
let stagingId = 0;
const createdPages: number[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ baseURL, playwright }) => {
  const request = await playwright.request.newContext({ baseURL });
  try {
    newsId = await createFolder(request, { name: "News", slug: "news" });
    stagingId = await createFolder(request, { name: "Staging", slug: "staging" });
  } finally {
    await request.dispose();
  }
});

test.afterEach(async ({ request }) => {
  for (const id of createdPages.splice(0)) {
    await request.delete(`/api/pages/${id}`);
  }
});

test.afterAll(async ({ baseURL, playwright }) => {
  const request = await playwright.request.newContext({ baseURL });
  try {
    for (const folderId of [newsId, stagingId]) {
      for (const row of await childrenOf(request, folderId)) {
        await deletePage(request, row.id);
      }
      await deleteFolder(request, folderId);
    }
  } finally {
    await request.dispose();
  }
});

const addPage = async (
  request: Parameters<typeof createPage>[0],
  title: string,
  options: { folder?: number; status?: "draft" | "published" } = {}
): Promise<number> => {
  const id = await createPage(request, {
    folder: options.folder ?? stagingId,
    slug: title.toLowerCase().replaceAll(" ", "-"),
    status: options.status,
    title,
  });
  createdPages.push(id);

  return id;
};

const moveDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("picker-tree") });

const confirmDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });

const pickerRow = (dialog: Locator, title: string): Locator =>
  dialog.locator(`[data-testid="picker-row"][data-title="${title}"]`);

/** Opens the tree with Staging expanded, as an editor would before picking its pages. */
const openStaging = async (page: Page): Promise<void> => {
  await openContentTree(page);
  await expandFolder(page, "Staging");
};

const chooseFolder = async (page: Page, title: string): Promise<Locator> => {
  const dialog = moveDialog(page);
  await expect(dialog).toBeVisible();
  await pickerRow(dialog, title).click();

  return dialog;
};

test("Move to... into news shows the URL count and moves", async ({ page, request }) => {
  await addPage(request, "Move Probe");
  await openStaging(page);
  await rowCheckbox(page, "Move Probe").check();

  await toolbarButton(page, "Move to...").click();
  const dialog = await chooseFolder(page, "News");

  // The live line under the tree says what the move does before anything is confirmed.
  await expect(dialog.getByTestId("move-preview-line")).toHaveText("1 published URL will change");
  await dialog.getByRole("button", { exact: true, name: "Move" }).click();

  const confirm = confirmDialog(page);
  // The page is published in English and, through the fallback, in German: two URLs.
  await expect(confirm.getByTestId("url-change-summary")).toHaveText(
    "1 published URL will change (2 across 2 languages)."
  );
  await expect(confirm.getByTestId("url-samples")).toContainText(
    "/staging/move-probe becomes /news/move-probe"
  );
  await expect(confirm.getByRole("checkbox", { name: "Redirect the old URLs" })).toBeChecked();
  await expect(confirm.getByTestId("redirect-count")).toHaveText("(2 redirect entries)");
  await confirm.getByRole("button", { exact: true, name: "Move" }).click();

  await expect(page.getByText("Moved 1 item")).toBeVisible();
  // The row left Staging at once and the server has it in News at the new URL, with a redirect.
  await expect(pageRow(page, "Move Probe")).toHaveCount(0);
  const inNews = await childrenOf(request, newsId);
  expect(inNews.map((row) => [row.title, row.fullPath])).toEqual([
    ["Move Probe", "/news/move-probe"],
  ]);
  // One row per language the page is live in.
  expect(await redirectsFrom(request, "/staging/move-probe")).toBe(2);
  // The selection is gone: the toolbar made way for the header again.
  await expect(page.getByTestId("bulk-toolbar")).toHaveCount(0);
  await expect(folderRow(page, "News").getByTestId("child-count")).toHaveText("1");
});

test("a folder's own child is disabled with the reason", async ({ page }) => {
  await openContentTree(page);
  await rowCheckbox(page, "Blog").check();
  await toolbarButton(page, "Move to...").click();
  const dialog = moveDialog(page);
  await expect(dialog).toBeVisible();

  // Blog is off itself, and still opens from the keyboard to show what is inside it.
  await pickerRow(dialog, "Blog").focus();
  await page.keyboard.press("ArrowRight");
  const child = pickerRow(dialog, "2026");
  await expect(child).toBeVisible();

  // The folder itself and the folder inside it are off; the others are on.
  await expect(child).toHaveAttribute("aria-disabled", "true");
  await expect(pickerRow(dialog, "Blog")).toHaveAttribute("aria-disabled", "true");
  await expect(pickerRow(dialog, "Products")).not.toHaveAttribute("aria-disabled", "true");
  await child.hover();
  // Blog still has the keyboard focus, so its tooltip shows too; both give the same reason.
  await expect(
    page
      .getByRole("tooltip")
      .filter({ hasText: "A folder cannot be moved into itself or one of its subfolders" })
      .first()
  ).toBeVisible();

  // Pressing a disabled folder picks nothing (forced: Playwright refuses to click what is disabled).
  await child.click({ force: true });
  await expect(dialog.getByText("Choose a folder to see what changes")).toBeVisible();
  await expect(dialog.getByRole("button", { exact: true, name: "Move" })).toBeDisabled();
  await expect(child).not.toHaveAttribute("aria-selected", "true");
});

test("unticking Redirect writes no redirect", async ({ page, request }) => {
  await addPage(request, "No Redirect");
  await addPage(request, "Redirect Again");
  await openStaging(page);
  await rowCheckbox(page, "No Redirect").check();
  await toolbarButton(page, "Move to...").click();
  const dialog = await chooseFolder(page, "News");
  await expect(dialog.getByTestId("move-preview-line")).toBeVisible();
  await dialog.getByRole("button", { exact: true, name: "Move" }).click();

  const confirm = confirmDialog(page);
  const redirect = confirm.getByRole("checkbox", { name: "Redirect the old URLs" });
  await expect(redirect).toBeChecked();
  await redirect.uncheck();
  await confirm.getByRole("button", { exact: true, name: "Move" }).click();

  await expect(page.getByText("Moved 1 item")).toBeVisible();
  const inNews = await childrenOf(request, newsId);
  expect(inNews.map((row) => row.fullPath)).toEqual(["/news/no-redirect"]);
  expect(await redirectsFrom(request, "/staging/no-redirect")).toBe(0);

  // The next move in the same session starts ticked again: unticking was for that one move.
  await rowCheckbox(page, "Redirect Again").check();
  await toolbarButton(page, "Move to...").click();
  const secondDialog = await chooseFolder(page, "News");
  await expect(secondDialog.getByTestId("move-preview-line")).toBeVisible();
  await secondDialog.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(
    confirmDialog(page).getByRole("checkbox", { name: "Redirect the old URLs" })
  ).toBeChecked();
  await confirmDialog(page).getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 1 item").last()).toBeVisible();
  expect(await redirectsFrom(request, "/staging/redirect-again")).toBe(2);
});

test("Undo puts the item back", async ({ page, request }) => {
  await addPage(request, "Undo Alpha");
  await addPage(request, "Undo Beta");
  const before = (await childrenOf(request, stagingId)).map((row) => [row.title, row.fullPath]);
  expect(before).toHaveLength(2);
  const moveRequests: string[] = [];
  page.on("request", (sent) => {
    if (sent.method() === "POST" && sent.url().endsWith("/folders-tree/move")) {
      moveRequests.push(sent.url());
    }
  });
  // Without the poll, only what the Undo itself reads again can bring the rows back.
  await page.route("**/api/folders-tree/revision", (route) => route.abort());
  await openStaging(page);
  await rowCheckbox(page, "Undo Alpha").check();
  await rowCheckbox(page, "Undo Beta").check();
  await toolbarButton(page, "Move to...").click();
  const dialog = await chooseFolder(page, "News");
  await expect(dialog.getByTestId("move-preview-line")).toHaveText("2 published URLs will change");
  await dialog.getByRole("button", { exact: true, name: "Move" }).click();
  await confirmDialog(page).getByRole("button", { exact: true, name: "Move" }).click();

  await expect(page.getByText("Moved 2 items")).toBeVisible();
  expect((await childrenOf(request, newsId)).map((row) => row.title).toSorted()).toEqual([
    "Undo Alpha",
    "Undo Beta",
  ]);
  // Two pages, one request.
  expect(moveRequests).toHaveLength(1);

  await page.getByRole("button", { name: "Undo" }).click();

  await expect(page.getByText("Moved 2 items back")).toBeVisible();
  expect((await childrenOf(request, stagingId)).map((row) => [row.title, row.fullPath])).toEqual(
    before
  );
  expect(await childrenOf(request, newsId)).toEqual([]);
  // The undo is one request as well, and the rows are back under Staging in their old order.
  expect(moveRequests).toHaveLength(2);
  const rows = page.locator('[data-testid="tree-row"][data-kind="page"][data-title^="Undo "]');
  await expect(rows).toHaveCount(2);
  await expect(rows).toHaveText([/Undo/u, /Undo/u]);
  expect(
    await rows.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-title"))
    )
  ).toEqual(before.map(([title]) => title));
});

test("a stale move shows Reload and try again", async ({ page, request }) => {
  const id = await addPage(request, "Stale Probe");
  // The poll would refresh the tree before the editor acts; this test is about the one that did not.
  await page.route("**/api/folders-tree/revision", (route) => route.abort());
  await openStaging(page);
  await expect(pageRow(page, "Stale Probe")).toBeVisible();

  // Another editor moves the page while this tree still shows it in Staging.
  const other = await request.post("/api/folders-tree/move", {
    data: { items: [{ collection: "pages", id }], toFolder: newsId },
  });
  expect(other.ok()).toBe(true);

  await rowCheckbox(page, "Stale Probe").check();
  await toolbarButton(page, "Move to...").click();
  const dialog = await chooseFolder(page, "Archive");
  await expect(dialog.getByRole("alert")).toContainText("Reload and try again");
  await dialog.getByRole("button", { exact: true, name: "Move" }).click();

  const confirm = confirmDialog(page);
  await expect(confirm.getByTestId("blocked-list")).toContainText("Stale Probe");
  await expect(confirm.getByTestId("blocked-list")).toContainText("Reload and try again");
  // A refused move has no Move button, only the reasons and a way out.
  await expect(confirm.getByRole("button", { exact: true, name: "Move" })).toHaveCount(0);
  await confirm.getByRole("button", { exact: true, name: "Reload" }).click();

  // The tree read Staging again: the page is no longer there, and nothing moved on its own.
  await expect(pageRow(page, "Stale Probe")).toHaveCount(0);
  await expect(page.getByTestId("bulk-toolbar")).toHaveCount(0);
  expect((await childrenOf(request, newsId)).map((row) => row.title)).toEqual(["Stale Probe"]);
});

test("the folder search finds a nested folder and greys it out for a page it does not accept", async ({
  page,
  request,
}) => {
  await addPage(request, "Search Probe");
  await openStaging(page);
  await rowCheckbox(page, "Search Probe").check();
  await toolbarButton(page, "Move to...").click();
  const dialog = moveDialog(page);
  await expect(dialog).toBeVisible();

  await dialog.getByRole("searchbox", { name: "Search folders" }).fill("2026");

  // The hit shows its path, and 2026 takes Blog posts only: a plain page cannot go in.
  const hit = pickerRow(dialog, "2026");
  await expect(hit).toContainText("/blog/2026");
  await expect(hit).toHaveAttribute("aria-disabled", "true");
  await hit.hover();
  await expect(page.getByRole("tooltip")).toHaveText("/blog/2026 accepts only Blog post pages");

  await dialog.getByRole("searchbox", { name: "Search folders" }).fill("nothing like this");
  await expect(dialog.getByText('No folders match "nothing like this"')).toBeVisible();
});

test("a refused move puts the rows back and offers Reload", async ({ page, request }) => {
  await addPage(request, "Refused Probe");
  await openStaging(page);
  await page.route("**/api/folders-tree/move", async (route) => {
    // The preview passed; the move itself is refused, as when the tree changed in between.
    await route.fulfill({
      body: JSON.stringify({
        errors: [
          {
            data: { reason: "stale" },
            message: "This part of the tree changed. Reload and try again.",
          },
        ],
      }),
      contentType: "application/json",
      status: 409,
    });
  });
  await rowCheckbox(page, "Refused Probe").check();
  await toolbarButton(page, "Move to...").click();
  const dialog = await chooseFolder(page, "News");
  await expect(dialog.getByTestId("move-preview-line")).toBeVisible();
  await dialog.getByRole("button", { exact: true, name: "Move" }).click();
  await confirmDialog(page).getByRole("button", { exact: true, name: "Move" }).click();

  await expect(
    page.getByText("This part of the tree changed. Reload and try again.")
  ).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Reload" })).toBeVisible();
  // The row is back where it was, and the server never moved it.
  await expect(pageRow(page, "Refused Probe")).toBeVisible();
  expect((await childrenOf(request, stagingId)).map((row) => row.title)).toEqual(["Refused Probe"]);
  expect(await childrenOf(request, newsId)).toEqual([]);
  // The selection stays, so the editor can try again.
  await expect(page.getByTestId("bulk-toolbar")).toContainText("1 item selected");
});

test("a drafter cannot move a published page and is told so without detail", async ({
  baseURL,
  browser,
  request,
}) => {
  await addPage(request, "Live Probe");
  const drafter = await signInAs(browser, baseURL ?? "", "drafter@example.com");
  try {
    await openStaging(drafter.page);
    await rowCheckbox(drafter.page, "Live Probe").check();
    await toolbarButton(drafter.page, "Move to...").click();
    const dialog = await chooseFolder(drafter.page, "News");
    // Moving it would change a live URL, which takes the right to publish.
    await expect(dialog.getByRole("alert")).toHaveText(/\S/u);
    await dialog.getByRole("button", { exact: true, name: "Move" }).click();

    const confirm = confirmDialog(drafter.page);
    await expect(confirm.getByTestId("blocked-list")).toContainText("Live Probe");
    await expect(confirm.getByRole("button", { exact: true, name: "Move" })).toHaveCount(0);
    expect(await childrenOf(request, newsId)).toEqual([]);
  } finally {
    await drafter.context.close();
  }
});

test("a reorder inside one folder moves without asking", async ({ page, request }) => {
  await addPage(request, "Order One");
  await addPage(request, "Order Two");
  await addPage(request, "Order Three");
  // New pages go on top, so the newest is first.
  expect((await childrenOf(request, stagingId)).map((row) => row.title)).toEqual([
    "Order Three",
    "Order Two",
    "Order One",
  ]);
  await openStaging(page);
  await rowCheckbox(page, "Order Three").check();
  await toolbarButton(page, "Move to...").click();
  const dialog = await chooseFolder(page, "Staging");
  await dialog.getByLabel("At the bottom").check();
  await expect(dialog.getByTestId("move-preview-line")).toHaveText("No published URLs will change");
  await dialog.getByRole("button", { exact: true, name: "Move" }).click();

  // No question: the move is made and announced.
  await expect(page.getByText("Moved 1 item")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await childrenOf(request, stagingId)).map((row) => row.title)).toEqual([
    "Order Two",
    "Order One",
    "Order Three",
  ]);
});

test("confirmMoves always asks for a reorder", async ({ page, request }) => {
  // The first compile of a second dev server is slow.
  test.setTimeout(300_000);
  await addPage(request, "Always One");
  await addPage(request, "Always Two");
  try {
    await startStockServer({
      distDirectory: ".next-confirm",
      env: { FOLDERS_CONFIRM_MOVES: "always" },
    });
    await page.goto(`${stockServerUrl}/admin/collections/folders`);
    await page.getByRole("treegrid").waitFor();
    await expandFolder(page, "Staging");
    await rowCheckbox(page, "Always Two").check();
    await toolbarButton(page, "Move to...").click();
    const dialog = await chooseFolder(page, "Staging");
    await dialog.getByLabel("At the bottom").check();
    await expect(dialog.getByTestId("move-preview-line")).toHaveText(
      "No published URLs will change"
    );
    await dialog.getByRole("button", { exact: true, name: "Move" }).click();

    // A reorder changes no URL, and still asks, because the mode is "always".
    const confirm = confirmDialog(page);
    await expect(confirm).toBeVisible();
    await expect(confirm.getByTestId("url-change-summary")).toHaveText(
      "No published URL will change."
    );
    await expect(confirm.getByRole("checkbox", { name: "Redirect the old URLs" })).toHaveCount(0);
    // Nothing moved yet.
    expect((await childrenOf(request, stagingId)).map((row) => row.title)).toEqual([
      "Always Two",
      "Always One",
    ]);
    await confirm.getByRole("button", { exact: true, name: "Move" }).click();

    await expect(page.getByText("Moved 1 item")).toBeVisible();
    expect((await childrenOf(request, stagingId)).map((row) => row.title)).toEqual([
      "Always One",
      "Always Two",
    ]);
  } finally {
    stopStockServer();
  }
});
