import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";
import path from "node:path";

import { childrenOf, createFolder, createPage, removeFolderTree } from "./helpers/content.js";
import { writeFolderPathDrift } from "./helpers/drift.js";
import { dragRowTo, moveOver, startDrag } from "./helpers/drag.js";
import { startStockServer, stockServerUrl, stopStockServer } from "./helpers/stockServer.js";
import {
  breadcrumb,
  breadcrumbs,
  expandFolder,
  folderRow,
  openContentTree,
  openZoomedTree,
  pageRow,
  rowCheckbox,
  toolbarButton,
  zoomHeader,
} from "./helpers/tree.js";

// Each test works in folders of its own, so the seeded tree the other specs read stays as it is.
// The seeded rows used here are only read: Blog, 2026, Company and Empty.
test.use({ viewport: { height: 1100, width: 1280 } });

const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  // Newest first, each with whatever a test moved into it.
  for (const id of createdFolders.splice(0).toReversed()) {
    if ((await request.get(`/api/folders/${id}?depth=0`)).ok()) {
      await removeFolderTree(request, id);
    }
  }
  // A visit with no list in the address restores the saved one; no test may leave its own.
  await request.delete("/api/payload-preferences/foldersTree.expanded");
});

const slugOf = (title: string): string => title.toLowerCase().replaceAll(" ", "-");

const addFolder = async (
  request: APIRequestContext,
  name: string,
  parent?: number
): Promise<number> => {
  const id = await createFolder(request, {
    name,
    ...(parent === undefined ? {} : { parent }),
    slug: slugOf(name),
  });
  createdFolders.push(id);

  return id;
};

const addPage = (
  request: APIRequestContext,
  title: string,
  folder: number,
  slug = slugOf(title)
): Promise<number> => createPage(request, { folder, slug, title });

const seededId = async (
  request: APIRequestContext,
  title: string,
  parent: number | "root" = "root"
): Promise<number> => {
  const row = (await childrenOf(request, parent)).find((child) => child.title === title);
  if (!row) {
    throw new Error(`The seed has no ${title}`);
  }

  return row.id;
};

/** An entry of the header's Create menu. */
const createEntry = (page: Page, name: string): Locator =>
  page.getByTestId("create-menu").getByRole("menuitem", { exact: true, name });

const confirmDialog = (page: Page): Locator =>
  page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });

/** Confirms the move dialog a published page's URL change asks for. */
const confirmMove = async (page: Page): Promise<void> => {
  await confirmDialog(page).getByRole("button", { exact: true, name: "Move" }).click();
  await expect(confirmDialog(page)).toHaveCount(0);
};

const folderOf = async (
  request: APIRequestContext,
  id: number,
  collection = "pages"
): Promise<number | null> => {
  const response = await request.get(`/api/${collection}/${id}?depth=0`);

  return ((await response.json()) as { folder: number | null }).folder;
};

test("double click zooms and the breadcrumb returns", async ({ page, request }) => {
  const blogId = await seededId(request, "Blog");
  const yearId = await seededId(request, "2026", blogId);
  await openContentTree(page);

  await folderRow(page, "Blog").dblclick();

  // The address names the zoomed folder, the tree starts at it, and its crumbs lead back.
  await expect(page).toHaveURL(new RegExp(`[?&]folder=${blogId}(&|$)`, "u"));
  await expect(breadcrumbs(page)).toContainText("Content");
  await expect(zoomHeader(page)).toHaveText("Blog");
  await expect(pageRow(page, "Blog Home")).toBeVisible();
  await expect(folderRow(page, "2026")).toBeVisible();
  await expect(folderRow(page, "Products")).toHaveCount(0);
  // The rows are the zoomed folder's own, one level in.
  await expect(page.locator('[data-testid="tree-row"][aria-level="1"]')).toHaveCount(5);

  // Zoom again, from inside the zoom: the crumbs grow.
  await folderRow(page, "2026").dblclick();
  await expect(page).toHaveURL(new RegExp(`[?&]folder=${yearId}(&|$)`, "u"));
  await expect(breadcrumbs(page).getByRole("link")).toHaveText(["Content", "Blog"]);
  await expect(zoomHeader(page)).toHaveText("2026");

  // A crumb zooms back to its folder, and the one for the top level returns to the whole tree.
  await breadcrumb(page, "Blog").click();
  await expect(page).toHaveURL(new RegExp(`[?&]folder=${blogId}(&|$)`, "u"));
  await expect(zoomHeader(page)).toHaveText("Blog");
  await breadcrumb(page, "Content").click();
  await expect(page).not.toHaveURL(/[?&]folder=/u);
  await expect(breadcrumbs(page)).toHaveCount(0);
  await expect(folderRow(page, "Products")).toBeVisible();
  await expect(folderRow(page, "Blog")).toBeVisible();

  // Back and Forward walk the zoom: the history keeps one entry for each.
  await page.goBack();
  await expect(zoomHeader(page)).toHaveText("Blog");
  await page.goBack();
  await expect(zoomHeader(page)).toHaveText("2026");
  await page.goForward();
  await expect(zoomHeader(page)).toHaveText("Blog");
  await page.goForward();
  await expect(breadcrumbs(page)).toHaveCount(0);
  await expect(folderRow(page, "Products")).toBeVisible();
});

/** A small generator with a fixed seed, so the series of history steps is the same on every run. */
const seededRandom = (seed: number): (() => number) => {
  let state = seed;

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;

    return state / 2_147_483_648;
  };
};

// The zoom follows the browser's address, not the router's copy of it, which falls behind when
// history steps come quickly. This walks a fixed series of bursts (back and forward steps taken in
// one script, so no step waits for the one before) through the five entries a visit leaves, and
// after each burst the view must show the folder the address names. With the series seeded the
// same bursts run every time, and four of them left the view on another folder when the zoom
// read the router's copy.
test("after quick Back and Forward steps the view shows the folder the address names", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const blogId = await seededId(request, "Blog");
  const yearId = await seededId(request, "2026", blogId);
  await openContentTree(page);
  await folderRow(page, "Blog").dblclick();
  await expect(zoomHeader(page)).toHaveText("Blog");
  await folderRow(page, "2026").dblclick();
  await expect(zoomHeader(page)).toHaveText("2026");
  await breadcrumb(page, "Blog").click();
  await expect(zoomHeader(page)).toHaveText("Blog");
  await breadcrumb(page, "Content").click();
  await expect(breadcrumbs(page)).toHaveCount(0);
  await expect(folderRow(page, "Products")).toBeVisible();

  // The history is now Content, Blog, 2026, Blog, Content.
  const entriesOfVisit = 5;
  const random = seededRandom(12_345);
  const bursts: string[] = [];
  for (let round = 0; round < 22; round += 1) {
    const { index, length } = await page.evaluate(() => {
      const { navigation } = window as unknown as {
        navigation: { currentEntry: { index: number }; entries: () => unknown[] };
      };

      return { index: navigation.currentEntry.index, length: navigation.entries().length };
    });
    const lowest = length - entriesOfVisit;
    let position = index;
    let burst = "";
    const steps = 2 + Math.floor(random() * 4);
    for (let step = 0; step < steps; step += 1) {
      const canGoBack = position > lowest;
      const canGoForward = position < length - 1;
      const goBack = canGoBack && (!canGoForward || random() < 0.5);
      if (!(goBack || canGoForward)) {
        break;
      }
      burst += goBack ? "b" : "f";
      position += goBack ? -1 : 1;
    }
    bursts.push(burst);
    await page.evaluate((steps) => {
      for (const step of steps) {
        if (step === "b") {
          window.history.back();
        } else {
          window.history.forward();
        }
      }
    }, burst);
    // The router settles in its own time; the view has to settle on the address.
    await page.waitForTimeout(1500);
    const zoomed = new URL(page.url()).searchParams.get("folder");
    if (zoomed === null) {
      await expect(breadcrumbs(page), `burst ${round}: ${bursts.join(" ")}`).toHaveCount(0);
    } else {
      await expect(zoomHeader(page), `burst ${round}: ${bursts.join(" ")}`).toHaveText(
        zoomed === String(yearId) ? "2026" : "Blog"
      );
    }
  }
});

test("a zoomed address opens straight on the folder, with its breadcrumbs", async ({
  page,
  request,
}) => {
  const blogId = await seededId(request, "Blog");
  const yearId = await seededId(request, "2026", blogId);

  await openZoomedTree(page, yearId);

  await expect(breadcrumbs(page).getByRole("link")).toHaveText(["Content", "Blog"]);
  await expect(zoomHeader(page)).toHaveText("2026");
  await expect(
    page.locator('[data-kind="page"][data-collection="posts"][data-title="New Year"]')
  ).toBeVisible();
  // The top level was never needed.
  await expect(folderRow(page, "Products")).toHaveCount(0);
});

test("Alt+Enter on a folder zooms, and a double click on its chevron toggles once and zooms", async ({
  page,
  request,
}) => {
  const companyId = await seededId(request, "Company");
  await openContentTree(page);

  await folderRow(page, "Blog").focus();
  await page.keyboard.press("Alt+Enter");
  await expect(zoomHeader(page)).toHaveText("Blog");
  await breadcrumb(page, "Content").click();

  // Before the fix a double click on the chevron opened and closed the folder and zoomed anyway.
  await folderRow(page, "Company").getByRole("button", { name: "Expand Company" }).dblclick();
  await expect(page).toHaveURL(new RegExp(`[?&]folder=${companyId}(&|$)`, "u"));
  await breadcrumb(page, "Content").click();
  await expect(folderRow(page, "Company")).toHaveAttribute("aria-expanded", "true");
});

test("a malformed folder in the address says the folder was not found, not a raw error", async ({
  page,
}) => {
  await page.goto("/admin/collections/folders?expanded=&folder=abc");

  await expect(page.getByTestId("zoom-not-found")).toContainText("This folder was not found");
  await expect(page.getByTestId("zoom-not-found")).not.toContainText("400");
  await page.getByTestId("zoom-back").click();
  await expect(page).not.toHaveURL(/[?&]folder=/u);
  await expect(folderRow(page, "Blog")).toBeVisible();
});

test("a folder that is gone says so, and the way back leads to the top level", async ({ page }) => {
  await page.goto("/admin/collections/folders?expanded=&folder=99999999");

  await expect(page.getByTestId("zoom-not-found")).toContainText("This folder was not found");
  await page.getByTestId("zoom-back").click();
  await expect(page).not.toHaveURL(/[?&]folder=/u);
  await expect(folderRow(page, "Blog")).toBeVisible();
});

test("expanded folders survive a reload", async ({ page, request }) => {
  const blogId = await seededId(request, "Blog");
  const yearId = await seededId(request, "2026", blogId);
  await openContentTree(page);

  await expandFolder(page, "Blog");
  await expandFolder(page, "2026");
  await expect(
    page.locator('[data-kind="page"][data-collection="posts"][data-title="New Year"]')
  ).toBeVisible();
  // The address carries the open folders, so a link shows the same tree.
  await expect(page).toHaveURL(new RegExp(`[?&]expanded=${blogId}%2C${yearId}(&|$)`, "u"));

  await page.reload();
  await expect(folderRow(page, "Blog")).toHaveAttribute("aria-expanded", "true");
  await expect(folderRow(page, "2026")).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator('[data-kind="page"][data-collection="posts"][data-title="New Year"]')
  ).toBeVisible();

  // The admin preferences carry them too, for a visit with nothing in the address: it comes back
  // open, and the address says so.
  await expect
    .poll(async () => {
      const response = await request.get("/api/payload-preferences/foldersTree.expanded");

      return JSON.stringify(((await response.json()) as { value?: unknown }).value);
    })
    .toBe(JSON.stringify({ expanded: [String(blogId), String(yearId)] }));
  await page.goto("/admin/collections/folders");
  await expect(folderRow(page, "Blog")).toHaveAttribute("aria-expanded", "true");
  await expect(folderRow(page, "2026")).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(new RegExp(`[?&]expanded=${blogId}%2C${yearId}(&|$)`, "u"));

  // Closing one is remembered the same way.
  await folderRow(page, "2026").getByRole("button", { name: "Collapse 2026" }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]expanded=${blogId}(&|$)`, "u"));
  await page.reload();
  await expect(folderRow(page, "2026")).toHaveAttribute("aria-expanded", "false");
  await expect(folderRow(page, "Blog")).toHaveAttribute("aria-expanded", "true");
});

test("an empty folder shows This folder is empty with create links", async ({ page }) => {
  await openContentTree(page);

  // Opened in place: one muted row with two links, which start the create dialogs for that folder.
  await expandFolder(page, "Empty");
  const emptyRow = page.getByTestId("empty-row");
  await expect(emptyRow).toHaveText(/This folder is empty/u);
  await emptyRow.getByRole("button", { name: "Create folder" }).click();
  const folderDialog = page
    .getByRole("dialog")
    .filter({ has: page.getByTestId("create-folder-form") });
  await expect(folderDialog.getByTestId("parent-name")).toHaveText("Empty");
  await folderDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(folderDialog).toHaveCount(0);
  await emptyRow.getByRole("button", { name: "Create page" }).click();
  const pageDialog = page.getByRole("dialog").filter({ has: page.getByTestId("create-page-form") });
  await expect(pageDialog.getByRole("heading", { name: "New page" })).toBeVisible();
  await pageDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(pageDialog).toHaveCount(0);

  // Zoomed in, the same words fill the view as a panel, with the same two ways to start.
  await folderRow(page, "Empty").dblclick();
  const panel = page.getByTestId("empty-panel");
  await expect(panel).toContainText("This folder is empty");
  // Like "No content yet", it has a line under the title before the buttons.
  await expect(panel.locator("p")).toHaveText("Create a folder or a page in it to get started.");
  await expect(panel.getByRole("button", { name: "Create folder" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Create page" })).toBeVisible();
  await expect(page.getByRole("treegrid")).toHaveCount(0);
  await panel.getByRole("button", { name: "Create page" }).click();
  await expect(
    page
      .getByRole("dialog")
      .filter({ has: page.getByTestId("create-page-form") })
      .getByRole("heading", { name: "New page" })
  ).toBeVisible();
});

test("a drift written in the database shows the banner", async ({ page, request }) => {
  const driftId = await addFolder(request, "Drift Banner Lab");
  await openContentTree(page);
  await expect(folderRow(page, "Drift Banner Lab")).toBeVisible();
  // The tree is healthy, so no banner.
  await expect(page.getByTestId("drift-banner")).toHaveCount(0);

  // A script outside the plugin writes a path that the folder's place in the tree does not give.
  await writeFolderPathDrift(driftId, "/somewhere-else");

  // The quick verify runs on load, so a reload finds it.
  await page.reload();
  const banner = page.getByTestId("drift-banner");
  await expect(banner).toContainText("Some URLs are out of date.");
  await expect(banner.getByRole("button", { name: "Rebuild full URLs" })).toBeVisible();

  // The same strip holds the banners of running operations, so there is one place to look.
  await expect(page.getByTestId("tree-banners")).toContainText("Some URLs are out of date.");

  // Put the folder right again, so a later spec reads a healthy tree.
  const repaired = await request.post("/api/folders-tree/repair", { data: {} });
  expect(repaired.ok()).toBe(true);
});

// The create menu at the top works in the folder the view is zoomed into.
test("the header Create menu creates in the zoomed folder", async ({ page, request }) => {
  const labId = await addFolder(request, "Create Zoom Lab");
  const innerId = await addFolder(request, "Create Zoom Inner", labId);
  await openZoomedTree(page, innerId);
  await expect(zoomHeader(page)).toHaveText("Create Zoom Inner");

  await page.getByTestId("create-button").click();
  await createEntry(page, "Folder").click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByTestId("create-folder-form") });
  await expect(dialog.getByTestId("parent-name")).toHaveText("Create Zoom Inner");
  await dialog.getByTestId("name-input").fill("Made Under Zoom");
  await dialog.getByRole("button", { exact: true, name: "Create" }).click();

  // The new folder is in the zoomed one, and shows in the view at once.
  await expect(folderRow(page, "Made Under Zoom")).toBeVisible();
  const rows = await childrenOf(request, innerId);
  expect(rows.map((row) => row.title)).toEqual(["Made Under Zoom"]);
  createdFolders.push(rows[0]?.id as number);

  // A page too: it is made in the zoomed folder, and its edit view opens.
  await page.getByTestId("create-button").click();
  await createEntry(page, "Page").click();
  const pageDialog = page.getByRole("dialog").filter({ has: page.getByTestId("create-page-form") });
  await pageDialog.getByTestId("title-input").fill("Made Under Zoom Page");
  await pageDialog.getByRole("button", { exact: true, name: "Create" }).click();
  await expect(page).toHaveURL(/\/admin\/collections\/pages\/\d+/u);
  const inFolder = await childrenOf(request, innerId);
  expect(inFolder.map((row) => row.title)).toContain("Made Under Zoom Page");
});

test("dropping on a breadcrumb moves the rows into that folder", async ({ page, request }) => {
  const labId = await addFolder(request, "Crumb Lab");
  const innerId = await addFolder(request, "Crumb Inner", labId);
  const pageId = await addPage(request, "Crumb Traveller", innerId);
  await openZoomedTree(page, innerId);
  await expect(pageRow(page, "Crumb Traveller")).toBeVisible();
  await expect(breadcrumb(page, "Crumb Lab")).toBeVisible();

  await startDrag(page, pageRow(page, "Crumb Traveller"));
  await moveOver(page, breadcrumb(page, "Crumb Lab"), "inside");
  // The crumb lights up like a folder row, and the page is on its way there.
  await expect(breadcrumb(page, "Crumb Lab")).toHaveClass(/fr-folders-crumb--drop-inside/u);
  await page.mouse.up();

  // The page's URL changes with its folder, so the editor confirms.
  await confirmMove(page);
  await expect.poll(() => folderOf(request, pageId)).toBe(labId);
  await expect(pageRow(page, "Crumb Traveller")).toHaveCount(0);
});

test("in Move mode a crumb has a Move here button that moves the marked rows into its folder", async ({
  page,
  request,
}) => {
  const labId = await addFolder(request, "Crumb Mode Lab");
  const innerId = await addFolder(request, "Crumb Mode Inner", labId);
  const pageId = await addPage(request, "Crumb Mode Traveller", innerId);
  await openZoomedTree(page, innerId);
  await rowCheckbox(page, "Crumb Mode Traveller").check();
  await toolbarButton(page, "Move").click();
  await expect(page.getByTestId("move-mode-bar")).toContainText("Moving 1 item");

  // Every crumb has its button, the zoomed folder's own included, and none shows outside Move mode.
  await expect(breadcrumbs(page).getByTestId("crumb-move")).toHaveCount(3);
  await expect(breadcrumb(page, "Crumb Mode Lab").getByTestId("crumb-move")).toHaveAccessibleName(
    "Move 1 item into Crumb Mode Lab"
  );
  // The crumb is still a link: it zooms while Move mode stays on.
  await breadcrumb(page, "Crumb Mode Lab").getByRole("link").click();
  await expect(page.getByTestId("zoom-current")).toHaveText("Crumb Mode Lab");
  await expect(page.getByTestId("move-mode-bar")).toBeVisible();
  await expect(breadcrumbs(page).getByTestId("crumb-move")).toHaveCount(2);

  // The zoomed folder's own crumb is the folder the page is not in yet: the button picks it, and
  // the same confirm as any other target asks before a published page's URL changes.
  await zoomHeader(page).getByTestId("crumb-move").click();
  await confirmMove(page);
  await expect.poll(() => folderOf(request, pageId)).toBe(labId);
  await expect(page.getByTestId("move-mode-bar")).toHaveCount(0);
  await expect(breadcrumbs(page).getByTestId("crumb-move")).toHaveCount(0);
});

test("in Move mode a crumb that cannot take the rows is disabled with the reason, and picks nothing", async ({
  page,
  request,
}) => {
  const labId = await addFolder(request, "Crumb Refuse Lab");
  const innerId = await addFolder(request, "Crumb Refuse Inner", labId);
  await addFolder(request, "Crumb Refuse Leaf", innerId);
  await openZoomedTree(page, labId);
  await rowCheckbox(page, "Crumb Refuse Inner").check();
  await toolbarButton(page, "Move").click();
  await expect(page.getByTestId("move-mode-bar")).toContainText("Moving 1 item");

  // The folder is already in the zoomed one: nothing would change.
  const lab = zoomHeader(page).getByTestId("crumb-move");
  await expect(lab).toHaveAttribute("aria-disabled", "true");
  await expect(lab).toHaveAttribute("title", "It is already here");
  await lab.click({ force: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("move-mode-bar")).toBeVisible();

  // The Content crumb takes it: the folder goes to the top level (nothing published, no question).
  await breadcrumb(page, "Content").getByTestId("crumb-move").click();
  await expect
    .poll(async () => (await childrenOf(request, "root")).some((row) => row.id === innerId))
    .toBe(true);
  await expect(page.getByTestId("move-mode-bar")).toHaveCount(0);
});

test("the crumbs are at least 24 pixels tall to hit, and sit clear of the header rule", async ({
  page,
  request,
}) => {
  const labId = await addFolder(request, "Crumb Size Lab");
  const innerId = await addFolder(request, "Crumb Size Inner", labId);
  await openZoomedTree(page, innerId);

  const heights = await page
    .locator('[data-testid="breadcrumb"], [data-testid="zoom-header"]')
    .evaluateAll((crumbs) => crumbs.map((crumb) => crumb.getBoundingClientRect().height));
  expect(heights).toHaveLength(3);
  for (const height of heights) {
    expect(height).toBeGreaterThanOrEqual(24);
  }
  const topPadding = await breadcrumbs(page).evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).paddingTop)
  );
  expect(topPadding).toBeGreaterThanOrEqual(12);
});

test("dropping on the Content crumb moves the rows to the top level", async ({ page, request }) => {
  const labId = await addFolder(request, "Top Crumb Lab");
  const innerId = await addFolder(request, "Top Crumb Inner", labId);
  await openZoomedTree(page, labId);
  await expect(folderRow(page, "Top Crumb Inner")).toBeVisible();

  // A folder with nothing published in it moves without a question.
  await dragRowTo(page, folderRow(page, "Top Crumb Inner"), breadcrumb(page, "Content"), "inside");

  await expect
    .poll(async () => (await childrenOf(request, "root")).some((row) => row.id === innerId))
    .toBe(true);
  await expect(folderRow(page, "Top Crumb Inner")).toHaveCount(0);
});

test("a crumb that would take the rows against a rule shows the reason and takes nothing", async ({
  page,
  request,
}) => {
  const labId = await addFolder(request, "Rule Crumb Lab");
  const innerId = await addFolder(request, "Rule Crumb Inner", labId);
  // A page whose segment the site itself uses cannot sit at the top level.
  const pageId = await addPage(request, "Rule Traveller", innerId, "admin");
  await openZoomedTree(page, innerId);

  await startDrag(page, pageRow(page, "Rule Traveller"));
  await moveOver(page, breadcrumb(page, "Content"), "inside");

  await expect(page.getByTestId("drop-reason")).toHaveText("/admin is used by the site itself");
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await folderOf(request, pageId)).toBe(innerId);
});

test("dropping on the zoom header moves rows from an opened subfolder to the top of the zoomed folder", async ({
  page,
  request,
}) => {
  const labId = await addFolder(request, "Header Lab");
  const innerId = await addFolder(request, "Header Inner", labId);
  const pageId = await addPage(request, "Header Traveller", innerId);
  await openZoomedTree(page, labId);
  await expandFolder(page, "Header Inner");
  await expect(pageRow(page, "Header Traveller")).toBeVisible();

  await startDrag(page, pageRow(page, "Header Traveller"));
  await moveOver(page, zoomHeader(page), "inside");
  await expect(zoomHeader(page)).toHaveClass(/fr-folders-crumb--drop-inside/u);
  await page.mouse.up();

  await confirmMove(page);
  await expect.poll(() => folderOf(request, pageId)).toBe(labId);
  // It is the first row of the zoomed folder now.
  await expect(page.locator('[data-testid="tree-row"][aria-level="1"]').first()).toHaveAttribute(
    "data-title",
    "Header Traveller"
  );
});

test("a drop into a zoomed folder is checked against that folder, not against the top level", async ({
  page,
  request,
}) => {
  const labId = await addFolder(request, "Zoom Rules Lab");
  const innerId = await addFolder(request, "Zoom Rules Inner", labId);
  // The segment `admin` is refused at the top level only: below a folder it is a plain segment.
  const pageId = await addPage(request, "Zoom Rules Traveller", innerId, "admin");
  // The page opens straight on the folder, so its own row arrives only with the breadcrumbs.
  await openZoomedTree(page, labId);
  await expandFolder(page, "Zoom Rules Inner");

  await startDrag(page, pageRow(page, "Zoom Rules Traveller"));
  await moveOver(page, folderRow(page, "Zoom Rules Inner"), "before");
  await expect(page.getByTestId("drop-reason")).toHaveCount(0);
  await page.mouse.up();

  await confirmMove(page);
  await expect.poll(() => folderOf(request, pageId)).toBe(labId);
});

test("a drop deep in a zoomed folder is refused by the depth limit of that folder", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  // A chain of 18 folders, so the folders below the last one are at depth 19 and 20: the limit.
  let parent: number | undefined;
  let deepest = 0;
  for (let level = 1; level <= 18; level += 1) {
    deepest = await addFolder(request, `Depth Lab ${level}`, parent);
    parent = deepest;
  }
  const targetId = await addFolder(request, "Depth Target", deepest);
  const movingId = await addFolder(request, "Depth Mover", deepest);
  await addFolder(request, "Depth Mover Child", movingId);
  await openZoomedTree(page, deepest);
  // The mover's own child is read once the mover is opened; the check can only count what is loaded.
  await expandFolder(page, "Depth Mover");
  await expect(folderRow(page, "Depth Mover Child")).toBeVisible();

  // The mover is two folders deep and the target is at depth 19, so the child would be at 21.
  await startDrag(page, folderRow(page, "Depth Mover"));
  await moveOver(page, folderRow(page, "Depth Target"), "inside");
  await expect(page.getByTestId("drop-reason")).toHaveText(
    "This would make URLs 21 segments deep; the limit is 20"
  );
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await childrenOf(request, targetId)).length).toBe(0);
});

test("a fresh database shows No content yet", async ({ page }) => {
  // A second dev server, on a database of its own that no seed has touched.
  test.setTimeout(360_000);
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (!databaseDirectory) {
    throw new Error("FOLDERS_E2E_DATABASE_DIRECTORY is not set");
  }
  try {
    await startStockServer({
      distDirectory: ".next-fresh",
      env: { DATABASE_URI: `file:${path.join(databaseDirectory, "fresh.db")}` },
    });
    await page.goto(`${stockServerUrl}/admin/collections/folders?expanded=`);

    const panel = page.getByTestId("empty-panel");
    await expect(panel).toContainText("No content yet");
    await expect(panel.getByRole("button", { name: "Create folder" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Create page" })).toBeVisible();
    await expect(page.getByRole("treegrid")).toHaveCount(0);

    // The folder it creates is the first row, and the panel gives way to the tree.
    await panel.getByRole("button", { name: "Create folder" }).click();
    const dialog = page.getByRole("dialog").filter({ has: page.getByTestId("create-folder-form") });
    await dialog.getByTestId("name-input").fill("First Folder");
    await dialog.getByRole("button", { exact: true, name: "Create" }).click();
    await expect(folderRow(page, "First Folder")).toBeVisible();
    await expect(page.getByTestId("empty-panel")).toHaveCount(0);
  } finally {
    stopStockServer();
  }
});
