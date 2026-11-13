import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { addDraftPages, holdSteps } from "./helpers/bulk.js";
import {
  childrenOf,
  countIn,
  createFolder,
  createPage,
  createPost,
  deleteFolderWithContent,
  removeFolderTree,
} from "./helpers/content.js";
import { menuItem, openRowMenu } from "./helpers/menu.js";
import {
  expandFolder,
  folderRow,
  openContentTree,
  pageRow,
  reloadClosed,
  rowCheckbox,
  toolbarButton,
} from "./helpers/tree.js";

// Every test works on its own folders, so the seeded tree the other specs read stays as it is.
const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  // Newest first, each with what was put into it: a folder that is not empty is refused.
  for (const id of createdFolders.splice(0).toReversed()) {
    if ((await request.get(`/api/folders/${id}?depth=0`)).ok()) {
      await removeFolderTree(request, id);
    }
  }
});

const addFolder = async (
  request: Parameters<typeof createFolder>[0],
  name: string,
  parent?: number
): Promise<number> => {
  const id = await createFolder(request, {
    name,
    ...(parent === undefined ? {} : { parent }),
    slug: name.toLowerCase().replaceAll(" ", "-"),
  });
  createdFolders.push(id);

  return id;
};

const addPage = (
  request: Parameters<typeof createPage>[0],
  title: string,
  folder: number,
  status: "draft" | "published" = "published"
): Promise<number> =>
  createPage(request, { folder, slug: title.toLowerCase().replaceAll(" ", "-"), status, title });

/** The dialog that holds a test id, which is the one on screen. */
const dialogWith = (page: Page, testId: string) =>
  page.getByRole("dialog").filter({ has: page.getByTestId(testId) });

test("deleting a folder with 12 pages needs its segment typed", async ({ page, request }) => {
  const folderId = await addFolder(request, "Delete Probe");
  for (let index = 1; index <= 12; index += 1) {
    await addPage(request, `Probe Page ${index}`, folderId);
  }
  const deleteRequests: string[] = [];
  page.on("request", (sent) => {
    if (sent.method() === "POST" && sent.url().endsWith("/api/folders-tree/delete")) {
      deleteRequests.push(sent.url());
    }
  });
  await openContentTree(page);
  await openRowMenu(folderRow(page, "Delete Probe"));
  await menuItem(page, "Delete").click();

  const dialog = dialogWith(page, "delete-dialog");
  await expect(dialog.getByText("Delete /delete-probe and everything in it")).toBeVisible();
  await expect(dialog.getByTestId("delete-summary")).toContainText(
    "1 folder and 12 pages will be deleted."
  );
  await expect(dialog.getByTestId("delete-listing")).toContainText("/delete-probe");
  await expect(dialog.getByTestId("delete-trash-note")).toHaveText(
    "This deletes everything for good. It cannot be undone."
  );
  const confirmButton = dialog.getByRole("button", { exact: true, name: "Delete" });
  const wordInput = dialog.getByTestId("delete-confirm-input");
  await expect(dialog.getByText("Type delete-probe to confirm")).toBeVisible();

  // Above 10 pages the button stays off until the folder's own segment is typed, exactly.
  await expect(confirmButton).toBeDisabled();
  await wordInput.fill("delete");
  await expect(confirmButton).toBeDisabled();
  await wordInput.fill("Delete-Probe");
  await expect(confirmButton).toBeDisabled();
  expect(deleteRequests).toEqual([]);

  await wordInput.fill("delete-probe");
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  await expect(page.getByText("Deleted 13 items")).toBeVisible();
  await expect(folderRow(page, "Delete Probe")).toHaveCount(0);
  expect((await request.get(`/api/folders/${folderId}?depth=0`)).status()).toBe(404);
  expect(await countIn(request, { collection: "pages", folder: folderId })).toBe(0);
});

test("duplicating a folder copies its subtree as drafts", async ({ page, request }) => {
  const sourceId = await addFolder(request, "Copy Source");
  const innerId = await addFolder(request, "Copy Inner", sourceId);
  await addPage(request, "Copy Page A", sourceId);
  await addPage(request, "Copy Page B", innerId);
  await openContentTree(page);
  await rowCheckbox(page, "Copy Source").check();
  await toolbarButton(page, "Duplicate").click();

  const dialog = dialogWith(page, "duplicate-dialog");
  await expect(dialog.getByTestId("duplicate-name-input")).toHaveValue("Copy Source (copy)");
  await expect(dialog.getByTestId("segment-input")).toHaveValue("copy-source-copy");
  await expect(dialog.getByTestId("duplicate-note")).toContainText(
    "A folder is copied with everything in it"
  );
  const copyButton = dialog.getByRole("button", { exact: true, name: "Duplicate" });
  await expect(copyButton).toBeEnabled();
  await copyButton.click();

  // The toast counts every copied document: two folders and two pages.
  await expect(page.getByText("Duplicated 4 items")).toBeVisible();
  await expect(folderRow(page, "Copy Source (copy)")).toBeVisible();

  const copy = (await childrenOf(request, "root")).find(
    (row) => row.title === "Copy Source (copy)"
  );
  expect(copy).toBeDefined();
  const copyId = copy?.id ?? 0;
  createdFolders.push(copyId);
  const copiedRows = await childrenOf(request, copyId);
  const copiedInner = copiedRows.find((row) => row.kind === "folder");
  expect(copiedRows.map((row) => row.title).toSorted()).toEqual(["Copy Inner", "Copy Page A"]);
  // The copy is a draft, whatever the original was.
  expect(copiedRows.find((row) => row.kind === "page")?.status).toBe("draft");
  const nestedRows = await childrenOf(request, copiedInner?.id ?? 0);
  expect(nestedRows.map((row) => [row.title, row.status])).toEqual([["Copy Page B", "draft"]]);
  // The original is untouched and still published.
  expect((await childrenOf(request, sourceId)).find((row) => row.kind === "page")?.status).toBe(
    "published"
  );
});

test("bulk duplicate into the same folder is refused", async ({ page, request }) => {
  const sourceId = await addFolder(request, "Bulk Source");
  const targetId = await addFolder(request, "Bulk Target");
  await addPage(request, "Bulk A", sourceId);
  await addPage(request, "Bulk B", sourceId);
  const duplicateRequests: string[] = [];
  page.on("request", (sent) => {
    if (sent.method() === "POST" && sent.url().includes("/api/folders-tree/duplicate")) {
      duplicateRequests.push(sent.url());
    }
  });
  await openContentTree(page);
  await expandFolder(page, "Bulk Source");
  await rowCheckbox(page, "Bulk A").check();
  await rowCheckbox(page, "Bulk B").check();
  await toolbarButton(page, "Duplicate").click();

  // The dialog opens on the folder the pages sit in and says so before anything is sent.
  const dialog = dialogWith(page, "duplicate-dialog");
  const copyButton = dialog.getByRole("button", { exact: true, name: "Duplicate" });
  await expect(dialog.getByText("Duplicate 2 items")).toBeVisible();
  await expect(dialog.getByTestId("duplicate-refusal")).toHaveText(
    "Bulk copies need another folder, because their URL segments would clash"
  );
  await expect(copyButton).toBeDisabled();
  expect(duplicateRequests).toEqual([]);

  // Choosing another folder lifts the refusal.
  await dialog.getByTestId("parent-change").click();
  await dialog.locator('[data-testid="picker-row"][data-title="Bulk Target"]').click();
  await expect(dialog.getByTestId("duplicate-refusal")).toHaveCount(0);
  await expect(copyButton).toBeEnabled();
  await copyButton.click();

  await expect(page.getByText("Duplicated 2 items")).toBeVisible();
  expect(duplicateRequests).toHaveLength(1);
  expect(await countIn(request, { collection: "pages", folder: targetId, status: "draft" })).toBe(
    2
  );
  expect(await countIn(request, { collection: "pages", folder: sourceId })).toBe(2);
});

test("publishing a folder states the page count", async ({ page, request }) => {
  const folderId = await addFolder(request, "Publish Probe");
  const subId = await addFolder(request, "Publish Sub", folderId);
  for (const title of ["Draft One", "Draft Two", "Draft Three"]) {
    await addPage(request, title, folderId, "draft");
  }
  for (const title of ["Sub Draft One", "Sub Draft Two"]) {
    await addPage(request, title, subId, "draft");
  }
  await addPage(request, "Already Live", folderId);
  await createPost(request, { folder: folderId, slug: "always-live", title: "Always Live" });
  await openContentTree(page);
  await openRowMenu(folderRow(page, "Publish Probe"));
  await menuItem(page, "Publish").click();

  const dialog = dialogWith(page, "publish-dialog");
  await expect(dialog.getByText("Publish 5 pages in 2 folders?")).toBeVisible();
  await expect(dialog.getByTestId("publish-body")).toHaveText("They will be public at their URLs.");
  await expect(dialog.getByTestId("publish-live-list")).toHaveText(
    "Blog post: 1 page is always live and is skipped"
  );
  await expect(dialog.getByTestId("publish-unchanged")).toHaveText(
    "1 page is already in that state and is skipped"
  );
  await dialog.getByRole("button", { exact: true, name: "Publish" }).click();

  await expect(page.getByText("Published 5 pages")).toBeVisible();
  expect(
    await countIn(request, { collection: "pages", folder: folderId, status: "published" })
  ).toBe(4);
  expect(await countIn(request, { collection: "pages", folder: subId, status: "published" })).toBe(
    2
  );
});

test("a 2,000-page publish shows progress and resumes from the banner after closing", async ({
  page,
  request,
}) => {
  // Seeding and publishing 2,000 pages is slow by nature: ten steps of 200 documents each.
  test.setTimeout(900_000);
  const folderId = await createFolder(request, { name: "Bulk Publish", slug: "bulk-publish" });
  try {
    await addDraftPages(request, folderId, 2000);
    const steps = await holdSteps(page, [2, 4]);
    await openContentTree(page);
    await rowCheckbox(page, "Bulk Publish").check();
    await toolbarButton(page, "Publish").click();

    const dialog = dialogWith(page, "publish-dialog");
    await expect(dialog.getByText("Publish 2000 pages in 1 folder?")).toBeVisible();
    await expect(dialog.getByTestId("publish-batched")).toBeVisible();
    await dialog.getByRole("button", { exact: true, name: "Publish" }).click();

    // The first step is done and the second is held: the dialog shows the bar and the count.
    const progress = dialogWith(page, "progress-dialog");
    await steps.waitUntilHeld(2);
    await expect(progress.getByText("Publishing 2000 pages")).toBeVisible();
    await expect(progress.getByTestId("progress-count")).toHaveText("200 of 2000");
    await expect(progress.getByTestId("progress-bar")).toHaveAttribute("value", "10");

    // Closing leaves the banner, with the same count.
    await progress.getByRole("button", { name: "Close and keep working" }).click();
    await expect(progress).toHaveCount(0);
    const banner = page.getByTestId("operation-banner");
    await expect(banner.getByTestId("operation-banner-text")).toHaveText("Publishing: 200 of 2000");

    // Behind the banner the work goes on: steps two and three run, and the fourth is held.
    steps.release(2);
    await steps.waitUntilHeld(4);
    await expect(banner.getByTestId("operation-banner-text")).toHaveText("Publishing: 600 of 2000");

    // A reload while it is unfinished: the banner comes back from the operation's record and the
    // stepping resumes from where the server stands (the held step never reached it).
    await reloadClosed(page);
    await expect(page.getByTestId("operation-banner-text")).toHaveText(
      /^Publishing: \d+ of 2000$/u
    );
    expect(
      Number(
        (await page.getByTestId("operation-banner-text").textContent())?.match(/: (\d+) of/u)?.[1]
      )
    ).toBeGreaterThanOrEqual(600);
    steps.release(4);

    await expect(page.getByText("Published 2000 pages")).toBeVisible({ timeout: 300_000 });
    await expect(page.getByTestId("operation-banner")).toHaveCount(0);
    expect(
      await countIn(request, { collection: "pages", folder: folderId, status: "published" })
    ).toBe(2000);
    // The tree was read again after the last step: the pages show as published.
    await expandFolder(page, "Bulk Publish");
    await expect(pageRow(page, "Draft page 0001").getByTestId("status-dot")).toHaveAttribute(
      "data-status",
      "published"
    );
  } finally {
    await deleteFolderWithContent(request, { confirmWord: "bulk-publish", folder: folderId });
  }
});

test("a failed run can be stopped, and the stop says how far it got and clears the banner", async ({
  page,
  request,
}) => {
  test.setTimeout(300_000);
  const folderId = await createFolder(request, { name: "Stop Probe", slug: "stop-probe" });
  try {
    await addDraftPages(request, folderId, 250);
    // The first step reaches the server and publishes 200 pages; the second fails on the page's side.
    let stepsSent = 0;
    await page.route("**/api/folders-tree/operations/*/step", async (route) => {
      stepsSent += 1;
      if (stepsSent === 2) {
        await route.fulfill({
          body: JSON.stringify({ done: 200, error: "Out of luck", status: "failed", total: 250 }),
          contentType: "application/json",
          status: 200,
        });

        return;
      }
      await route.continue();
    });
    await openContentTree(page);
    await rowCheckbox(page, "Stop Probe").check();
    await toolbarButton(page, "Publish").click();
    const dialog = dialogWith(page, "publish-dialog");
    await dialog.getByRole("button", { exact: true, name: "Publish" }).click();

    // The failure shows in the progress dialog with both ways out.
    const progress = dialogWith(page, "progress-dialog");
    await expect(progress.getByTestId("progress-failure")).toContainText("Out of luck");
    await expect(progress.getByRole("button", { name: "Try again" })).toBeVisible();
    await progress.getByRole("button", { name: "Stop" }).click();

    await expect(page.getByText("Stopped after 200 of 250")).toBeVisible();
    await expect(progress).toHaveCount(0);
    await expect(page.getByTestId("operation-banner")).toHaveCount(0);
    expect(
      await countIn(request, { collection: "pages", folder: folderId, status: "published" })
    ).toBe(200);

    // A stopped run does not come back with the next load.
    const resumeRead = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/folder-operations"
    );
    await reloadClosed(page);
    expect((await resumeRead).ok()).toBe(true);
    await expect(folderRow(page, "Stop Probe")).toBeVisible();
    await expect(page.getByTestId("operation-banner")).toHaveCount(0);
  } finally {
    await deleteFolderWithContent(request, { confirmWord: "stop-probe", folder: folderId });
  }
});
