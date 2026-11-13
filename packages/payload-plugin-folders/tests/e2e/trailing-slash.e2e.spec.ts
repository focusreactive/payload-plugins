import { expect, test } from "@playwright/test";

import { createFolder, createPage, removeFolderTree } from "./helpers/content.js";
import { menuItem, openRowMenu } from "./helpers/menu.js";
import { startStockServer, stockServerUrl, stopStockServer } from "./helpers/stockServer.js";
import { expandFolder, folderRow, pageRow } from "./helpers/tree.js";

// A second dev server with `urls.trailingSlash` and Next's own `trailingSlash` both on
// (FOLDERS_TRAILING_SLASH=true). The main server seeds the shared database through REST; this
// spec reads it through the second one, as a visitor and as an editor.

test.use({ viewport: { height: 1000, width: 1400 } });

test("the second server hands out the slash form in the frontend and in the admin", async ({
  page,
  request,
}) => {
  // The first compile of a second dev server is slow.
  test.setTimeout(300_000);
  const folderId = await createFolder(request, { name: "Slash Folder", slug: "ts-e2e" });
  const pageId = await createPage(request, { folder: folderId, slug: "team", title: "Slash Team" });
  try {
    await startStockServer({
      distDirectory: ".next-slash",
      env: { FOLDERS_TRAILING_SLASH: "true" },
    });

    // Frontend: Next redirects to the slash form, the plugin resolves in place, so one hop.
    const bare = await page.goto(`${stockServerUrl}/ts-e2e/team`);
    expect(bare?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/ts-e2e/team/");

    const capitalised = await page.goto(`${stockServerUrl}/TS-e2e/Team/`);
    expect(capitalised?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/ts-e2e/team/");
    let redirects = 0;
    for (
      let hop = capitalised?.request().redirectedFrom() ?? null;
      hop !== null;
      hop = hop.redirectedFrom()
    ) {
      redirects += 1;
    }
    expect(redirects).toBeLessThanOrEqual(2);

    expect((await request.get(`${stockServerUrl}/`)).status()).toBe(200);

    // Admin: the tree row, the edit view's Full URL and Copy URL show the same form.
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`${stockServerUrl}/admin/collections/folders?expanded=`);
    await page.getByRole("treegrid").waitFor();
    await expandFolder(page, "Slash Folder");
    await expect(folderRow(page, "Slash Folder").getByTestId("row-path")).toHaveText("/ts-e2e/");
    await expect(pageRow(page, "Slash Team").getByTestId("row-path")).toHaveText("/ts-e2e/team/");

    await openRowMenu(pageRow(page, "Slash Team"));
    await menuItem(page, "Copy URL").click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("/ts-e2e/team/");

    await page.goto(`${stockServerUrl}/admin/collections/pages/${pageId}`);
    await expect(page.getByTestId("full-path")).toHaveText("/ts-e2e/team/");
  } finally {
    await stopStockServer();
    await removeFolderTree(request, folderId);
  }
});
