import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

import { childrenOf, mirrorRowsFrom } from "./helpers/content.js";

// The dev app mirrors path changes into the Redirects collection of @payloadcms/plugin-redirects.
// The seed's `archive` folder holds 150 pages that are published in English and, through the
// fallback, in German: renaming it changes 300 URLs, more than the 200 an operation does at once.
test.use({ viewport: { height: 1000, width: 1280 } });

const archiveFolderId = async (request: APIRequestContext): Promise<number> => {
  const rows = await childrenOf(request, "root");
  const archive = rows.find((row) => row.kind === "folder" && row.title === "Archive");
  if (!archive) {
    throw new Error("The seeded Archive folder is missing");
  }

  return archive.id;
};

const renameArchive = async (request: APIRequestContext, slug: string): Promise<void> => {
  const response = await request.patch(`/api/folders/${await archiveFolderId(request)}`, {
    data: { slug },
  });
  expect(response.ok(), await response.text()).toBe(true);
};

type OperationProgress = { done: number; status: string; total: number };

const mirrorOperations = async (request: APIRequestContext): Promise<OperationProgress[]> => {
  const response = await request.get(
    "/api/folder-operations?where[kind][equals]=mirrorRedirects&limit=10&depth=0&sort=createdAt"
  );
  const { docs } = (await response.json()) as { docs: OperationProgress[] };

  return docs.map(({ done, status, total }) => ({ done, status, total }));
};

test("a rename above the sync limit stores a mirror batch that the open tree steps to the end", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  await page.goto("/admin/collections/folders");
  await page.getByRole("treegrid").waitFor();

  try {
    // The rename is saved from outside the page, as another editor's would be: the tree finds the
    // batch it stored when its next revision check sees the change.
    await renameArchive(request, "archive-renamed");
    expect(await mirrorRowsFrom(request, "/archive/entry-0001")).toBe(0);

    await expect
      .poll(() => mirrorRowsFrom(request, "/archive/entry-0001"), { timeout: 90_000 })
      .toBe(1);
    expect(await mirrorRowsFrom(request, "/de/archive/entry-0150")).toBe(1);
    expect(await mirrorOperations(request)).toEqual([{ done: 300, status: "done", total: 300 }]);
  } finally {
    // Back to the seed's name: the old URLs are live again, so the rows that started there go.
    await renameArchive(request, "archive");
  }
  await expect
    .poll(async () => (await mirrorOperations(request)).map((operation) => operation.status), {
      timeout: 90_000,
    })
    .toEqual(["done", "done"]);
  expect(await mirrorRowsFrom(request, "/archive/entry-0001")).toBe(0);
  expect(await mirrorRowsFrom(request, "/archive-renamed/entry-0001")).toBe(1);
});
