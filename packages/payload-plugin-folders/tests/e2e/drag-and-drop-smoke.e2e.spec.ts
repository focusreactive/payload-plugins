import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  childrenOf,
  createFolder,
  createPage,
  deleteFolder,
  deletePage,
} from "./helpers/content.js";
import { dragRowTo } from "./helpers/drag.js";
import { expandFolder, folderRow, openContentTree, pageRow } from "./helpers/tree.js";

// Rows on screen: the two folders these tests build, kept in view without scrolling.
test.use({ viewport: { height: 1000, width: 1280 } });
test.describe.configure({ mode: "serial" });

let labId = 0;
let targetId = 0;
const createdPages: number[] = [];

test.beforeAll(async ({ baseURL, playwright }) => {
  const request = await playwright.request.newContext({ baseURL });
  try {
    labId = await createFolder(request, { name: "Drag Smoke Lab", slug: "drag-smoke-lab" });
    targetId = await createFolder(request, {
      name: "Drag Smoke Target",
      slug: "drag-smoke-target",
    });
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
    for (const folderId of [labId, targetId]) {
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
  folder: number
): Promise<number> => {
  const id = await createPage(request, {
    folder,
    slug: title.toLowerCase().replaceAll(" ", "-"),
    title,
  });
  createdPages.push(id);

  return id;
};

const openLab = async (page: Page): Promise<void> => {
  await openContentTree(page);
  await expandFolder(page, "Drag Smoke Lab");
};

test("a mouse reorder within a folder persists after reload", async ({ page, request }) => {
  await addPage(request, "Smoke Alpha", labId);
  await addPage(request, "Smoke Beta", labId);
  await addPage(request, "Smoke Gamma", labId);
  // New pages go on top.
  expect((await childrenOf(request, labId)).map((row) => row.title)).toEqual([
    "Smoke Gamma",
    "Smoke Beta",
    "Smoke Alpha",
  ]);
  await openLab(page);

  // Alpha, the last, goes above Gamma, the first: the top zone of the first row.
  await dragRowTo(page, pageRow(page, "Smoke Alpha"), pageRow(page, "Smoke Gamma"), "before");

  // A reorder inside one folder changes no URL, so nothing asks.
  await expect(page.getByText("Moved 1 item")).toBeVisible();
  await page.reload();
  await page.getByRole("treegrid").waitFor();

  const rows = await childrenOf(request, labId);
  expect(rows.map((row) => [row.title, row.fullPath])).toEqual([
    ["Smoke Alpha", "/drag-smoke-lab/smoke-alpha"],
    ["Smoke Gamma", "/drag-smoke-lab/smoke-gamma"],
    ["Smoke Beta", "/drag-smoke-lab/smoke-beta"],
  ]);
});

test("a drop inside a folder asks to confirm the URL change", async ({ page, request }) => {
  await addPage(request, "Smoke Mover", labId);
  await openLab(page);

  await dragRowTo(
    page,
    pageRow(page, "Smoke Mover"),
    folderRow(page, "Drag Smoke Target"),
    "inside"
  );

  // The page is published, so moving it changes a live URL: the editor is asked first.
  const confirm = page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });
  await expect(confirm.getByTestId("url-change-summary")).toContainText(
    "1 published URL will change"
  );
  await expect(confirm.getByTestId("url-samples")).toContainText(
    "/drag-smoke-lab/smoke-mover becomes /drag-smoke-target/smoke-mover"
  );
  // Nothing moved yet.
  expect((await childrenOf(request, targetId)).map((row) => row.title)).toEqual([]);

  await confirm.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 1 item")).toBeVisible();

  await page.reload();
  await page.getByRole("treegrid").waitFor();
  expect((await childrenOf(request, targetId)).map((row) => [row.title, row.fullPath])).toEqual([
    ["Smoke Mover", "/drag-smoke-target/smoke-mover"],
  ]);
  expect(await childrenOf(request, labId)).toEqual([]);
});
