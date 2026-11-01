import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

import { createFolder, createPage, removeFolderTree } from "./helpers/content.js";
import { dragRowTo } from "./helpers/drag.js";
import { openRowMenu } from "./helpers/menu.js";
import { expandFolder, folderRow, openContentTree, pageRow } from "./helpers/tree.js";

// The content locale (Payload's locale picker, `?locale=`) decides which names and paths the tree
// shows; the admin's language (the browser's) decides the words around them. These tests change
// the first, and one of them the second too. Every test builds its own folders and removes them,
// and Payload remembers the locale per user, so the preference is deleted after each test.
test.use({ viewport: { height: 1000, width: 1280 } });

const createdFolders: number[] = [];

test.afterEach(async ({ request }) => {
  for (const id of createdFolders.splice(0).toReversed()) {
    if ((await request.get(`/api/folders/${id}?depth=0`)).ok()) {
      await removeFolderTree(request, id);
    }
  }
  await request.delete("/api/payload-preferences/locale");
  await request.delete("/api/payload-preferences/nav-sidebar-active-tab");
  await request.delete("/api/payload-preferences/foldersTree.expanded");
});

const slugOf = (text: string): string => text.toLowerCase().replaceAll(" ", "-");

/** A folder with an English name and segment, and German ones when given. */
const addFolder = async (
  request: APIRequestContext,
  name: string,
  german?: { name: string; slug: string }
): Promise<number> => {
  const id = await createFolder(request, { name, slug: slugOf(name) });
  createdFolders.push(id);
  if (german) {
    const response = await request.patch(`/api/folders/${id}?locale=de`, { data: german });
    expect(response.ok()).toBe(true);
  }

  return id;
};

/** A page published in English, and given a German title and segment when `german` is. */
const addPage = async (
  request: APIRequestContext,
  title: string,
  folder: number,
  german?: { slug: string; title: string }
): Promise<number> => {
  const id = await createPage(request, { folder, slug: slugOf(title), title });
  if (german) {
    // Saving German content leaves German unpublished; publishing it makes both locales live.
    expect((await request.patch(`/api/pages/${id}?locale=de`, { data: german })).ok()).toBe(true);
    expect(
      (await request.patch(`/api/pages/${id}?locale=de`, { data: { _status: "published" } })).ok()
    ).toBe(true);
  }

  return id;
};

const pathOf = (row: Locator): Locator => row.getByTestId("row-path");

/** Chooses the content locale in the header's picker, as an editor does. */
const switchContentLocale = async (page: Page, locale: string): Promise<void> => {
  await page.getByRole("button", { name: /^Locale: / }).click();
  await page.getByRole("menuitemradio", { exact: true, name: locale }).click();
  await expect(page).toHaveURL(new RegExp(`locale=${locale}`, "u"));
};

const openTree = async (page: Page, locale: string, expanded: readonly number[]): Promise<void> => {
  await page.goto(`/admin/collections/folders?locale=${locale}&expanded=${expanded.join(",")}`);
  await page.getByRole("treegrid").waitFor();
};

test("switching to de shows /aktuelles paths", async ({ page }) => {
  await openContentTree(page);
  await expandFolder(page, "Blog");
  await expect(pathOf(folderRow(page, "Blog"))).toHaveText("/blog");
  await expect(pathOf(pageRow(page, "Hello World"))).toHaveText("/blog/hello-world");
  await expect(pathOf(pageRow(page, "Team"))).toContainText("/blog/team");

  await switchContentLocale(page, "de");

  // The folder is Aktuelles at /aktuelles, and the rows inside stay open under it.
  const folder = folderRow(page, "Aktuelles");
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(pathOf(folder)).toHaveText("/aktuelles");
  // A translated folder segment composes into every page beneath it, translated or not: Hallo Welt
  // has a German segment of its own, Team falls back to the English one under the German folder.
  await expect(pathOf(pageRow(page, "Hallo Welt"))).toHaveText("/aktuelles/hallo-welt");
  await expect(pathOf(pageRow(page, "Team"))).toContainText("/aktuelles/team");
  await expect(pathOf(pageRow(page, "Blog Startseite"))).toHaveText("/aktuelles");
  await expect(folderRow(page, "Blog")).toHaveCount(0);

  // And back: the English names and paths return.
  await switchContentLocale(page, "en");
  await expect(pathOf(folderRow(page, "Blog"))).toHaveText("/blog");
  await expect(pathOf(pageRow(page, "Hello World"))).toHaveText("/blog/hello-world");
});

test("an untranslated page shows the fallback chip", async ({ page, request }) => {
  const folder = await addFolder(request, "Chip Folder", {
    name: "Chip Ordner",
    slug: "chip-ordner",
  });
  await addPage(request, "Chip Plain", folder);
  await addPage(request, "Chip Both", folder, { slug: "chip-beide", title: "Chip Beide" });

  // In English nothing falls back.
  await openTree(page, "en", [folder]);
  await expect(pageRow(page, "Chip Plain")).toBeVisible();
  await expect(page.getByTestId("fallback-chip")).toHaveCount(0);
  await expect(page.getByTestId("name-fallback-chip")).toHaveCount(0);

  // In German the page with nothing of its own shows the English title and segment, each marked
  // as a fallback, with the language it comes from; the translated page shows no chip.
  await openTree(page, "de", [folder]);
  const plain = pageRow(page, "Chip Plain");
  await expect(plain.getByTestId("name-fallback-chip")).toHaveText("fallback");
  await expect(plain.getByTestId("name-fallback-chip")).toHaveAttribute("title", /\(en\)/u);
  await expect(plain.getByTestId("fallback-chip")).toHaveText("fallback");
  await expect(plain.getByTestId("fallback-chip")).toHaveAttribute("title", /\(en\)/u);
  await expect(pathOf(plain)).toContainText("/chip-ordner/chip-plain");
  const both = pageRow(page, "Chip Beide");
  await expect(pathOf(both)).toContainText("/chip-ordner/chip-beide");
  await expect(both.getByTestId("name-fallback-chip")).toHaveCount(0);
  await expect(both.getByTestId("fallback-chip")).toHaveCount(0);
  // The folder has its own German name and segment: no chip on it either.
  await expect(folderRow(page, "Chip Ordner").getByTestId("name-fallback-chip")).toHaveCount(0);
  await expect(folderRow(page, "Chip Ordner").getByTestId("fallback-chip")).toHaveCount(0);

  // A folder with no German name shows the English one, and says so.
  const bare = await addFolder(request, "Chip Bare");
  await openTree(page, "de", [bare]);
  await expect(folderRow(page, "Chip Bare").getByTestId("name-fallback-chip")).toBeVisible();
  await expect(folderRow(page, "Chip Bare").getByTestId("fallback-chip")).toBeVisible();
});

test("the confirm dialog counts URLs in both locales", async ({ page, request }) => {
  const source = await addFolder(request, "Count Source", {
    name: "Zaehl Quelle",
    slug: "zaehl-quelle",
  });
  await addFolder(request, "Count Target", { name: "Zaehl Ziel", slug: "zaehl-ziel" });
  await addPage(request, "Count Page", source, { slug: "zaehl-seite", title: "Zaehl Seite" });

  // The editor works in German and moves the page into the other folder.
  await openTree(page, "de", [source]);
  await dragRowTo(page, pageRow(page, "Zaehl Seite"), folderRow(page, "Zaehl Ziel"), "inside");

  // One page, two published URLs: the dialog says so, and lists the URL of each language, the
  // German one with the German folder and segment.
  const confirm = page.getByRole("dialog").filter({ has: page.getByTestId("confirm-move") });
  await expect(confirm.getByTestId("url-change-summary")).toHaveText(
    "1 published URL will change (2 across 2 languages)."
  );
  const samples = confirm.getByTestId("url-samples");
  await expect(samples).toContainText("/zaehl-quelle/zaehl-seite becomes /zaehl-ziel/zaehl-seite");
  await expect(samples).toContainText("/count-source/count-page becomes /count-target/count-page");
  await expect(samples).toContainText("(de)");
  await expect(samples).toContainText("(en)");
  await expect(confirm.getByTestId("redirect-count")).toHaveText("(2 redirect entries)");
  await confirm.getByRole("button", { exact: true, name: "Move" }).click();
  await expect(page.getByText("Moved 1 item")).toBeVisible();
});

test("search matches the paths of the locale the tree shows", async ({ page }) => {
  // /aktuelles is the German path of Blog: only German has it.
  await page.goto("/admin/collections/folders?locale=en&expanded=&q=aktuelles");
  await expect(page.getByTestId("search-input")).toHaveValue("aktuelles");
  await expect(page.getByText('No results for "aktuelles"')).toBeVisible();

  await page.goto("/admin/collections/folders?locale=de&expanded=&q=aktuelles");
  await expect(pageRow(page, "Hallo Welt")).toBeVisible();
  await expect(folderRow(page, "Aktuelles")).toBeVisible();
  await expect(pathOf(pageRow(page, "Hallo Welt"))).toContainText("/aktuelles/hallo-welt");
});

test("the status dot is the page's status in the locale the tree shows", async ({
  page,
  request,
}) => {
  const folder = await addFolder(request, "Status Folder");
  // Published in English; saving German content leaves German a draft.
  const id = await addPage(request, "Status Page", folder);
  expect(
    (
      await request.patch(`/api/pages/${id}?locale=de`, {
        data: { slug: "status-seite", title: "Status Seite" },
      })
    ).ok()
  ).toBe(true);

  await openTree(page, "en", [folder]);
  await expect(pageRow(page, "Status Page").getByTestId("status-dot")).toHaveAttribute(
    "data-status",
    "published"
  );
  await openTree(page, "de", [folder]);
  await expect(pageRow(page, "Status Seite").getByTestId("status-dot")).toHaveAttribute(
    "data-status",
    "draft"
  );

  // Publishing German makes it live there too, and English is untouched.
  expect(
    (await request.patch(`/api/pages/${id}?locale=de`, { data: { _status: "published" } })).ok()
  ).toBe(true);
  await openTree(page, "de", [folder]);
  await expect(pageRow(page, "Status Seite").getByTestId("status-dot")).toHaveAttribute(
    "data-status",
    "published"
  );
});

test.describe("the admin in German", () => {
  test.use({ locale: "de-DE" });

  test("the strings around the tree are German while the content locale stays English", async ({
    page,
  }) => {
    await openTree(page, "en", []);

    // The words of the tree are German; the names and paths are the English content.
    await expect(page.getByRole("button", { name: "Erstellen" })).toBeVisible();
    await expect(page.getByTestId("search-input")).toHaveAttribute(
      "placeholder",
      "In Content suchen"
    );
    await expect(page.getByRole("columnheader", { name: "Typ" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Aktualisiert" })).toBeVisible();
    await expect(pathOf(folderRow(page, "Blog"))).toHaveText("/blog");
    await expect(folderRow(page, "Blog").getByTestId("child-count")).toBeVisible();
    await openRowMenu(folderRow(page, "Blog"));
    await expect(page.getByRole("menuitem", { exact: true, name: "Öffnen" })).toBeVisible();
    await page.keyboard.press("Escape");

    // The plugin's sidebar tab is named in German too, and holds the same tree.
    await page.getByRole("tab", { name: "Baum" }).click();
    const tab = page.getByTestId("sidebar-tab");
    await expect(tab.getByRole("button", { name: "Erstellen" })).toBeVisible();
    await expect(tab.getByTestId("search-input")).toHaveAttribute(
      "placeholder",
      "In Content suchen"
    );
  });

  test("a page without German content says Ersatz, with the language it falls back to", async ({
    page,
    request,
  }) => {
    const folder = await addFolder(request, "Ersatz Folder");
    await addPage(request, "Ersatz Page", folder);

    await openTree(page, "de", [folder]);
    const row = pageRow(page, "Ersatz Page");
    await expect(row.getByTestId("name-fallback-chip")).toHaveText("Ersatz");
    await expect(row.getByTestId("name-fallback-chip")).toHaveAttribute(
      "title",
      "Diese Sprache hat keinen eigenen Namen, deshalb wird der Name der Standardsprache (en) gezeigt"
    );
    await expect(row.getByTestId("fallback-chip")).toHaveAttribute(
      "title",
      "Diese Sprache hat kein eigenes URL-Segment, deshalb wird das Segment der Standardsprache (en) gezeigt"
    );
  });
});
