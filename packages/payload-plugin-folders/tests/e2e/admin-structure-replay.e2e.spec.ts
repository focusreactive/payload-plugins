import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page, Request } from "@playwright/test";

import { createFolder, createPage, readPage, removeFolderTree } from "./helpers/content.js";

/**
 * The server refuses a REST update that names a different `folder`, `orderKey` or `parent` unless
 * the request carries an older `structureRevision` (a stale replay). That is only safe because the
 * admin's own saves always carry the stored structure with its revision. These tests record what
 * the admin really sends, so a change in Payload's form would fail here before it broke editing.
 */

const createdFolders: number[] = [];

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

type Structure = Record<string, unknown>;

/** The edit form posts multipart form data whose `_payload` part holds the document as JSON. */
const documentOf = (request: Request): Structure => {
  const raw = request.postData() ?? "";
  const part = raw.split("\r\n").findIndex((line) => line.includes('name="_payload"'));
  if (part === -1) {
    return JSON.parse(raw) as Structure;
  }

  return JSON.parse(raw.split("\r\n")[part + 2]) as Structure;
};

const recordUpdates = (page: Page, collection: string, id: number): Structure[] => {
  const bodies: Structure[] = [];
  page.on("request", (request: Request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === `/api/${collection}/${id}`
    ) {
      bodies.push(documentOf(request));
    }
  });

  return bodies;
};

const expectStoredStructure = (
  body: Structure,
  stored: { folder?: number | null; orderKey: unknown; parent?: number | null }
): void => {
  const parentField = "folder" in stored ? "folder" : "parent";
  expect(body).toHaveProperty("orderKey", stored.orderKey);
  expect(body).toHaveProperty("structureRevision", 0);
  expect(body[parentField]).toBe(stored[parentField as "folder" | "parent"]);
};

test("a page save from the edit form and its autosave carry the stored folder, orderKey and revision", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Replay Folder");
  const pageId = await createPage(request, {
    folder: folderId,
    slug: "replay-page",
    title: "Replay Page",
  });
  const stored = await readPage<{ orderKey: string }>(request, pageId);
  const bodies = recordUpdates(page, "pages", pageId);

  await page.goto(`/admin/collections/pages/${pageId}`);
  await page.getByTestId("folder-location").waitFor();
  await page.locator("#field-title").fill("Replay Page, autosaved");
  await expect.poll(() => bodies.length).toBeGreaterThan(0);
  const autosave = bodies[0];
  expectStoredStructure(autosave, { folder: folderId, orderKey: stored.orderKey });

  await page.locator("#action-save").click();
  await expect.poll(() => bodies.length).toBeGreaterThan(1);
  const publish = bodies.at(-1) as Structure;
  expectStoredStructure(publish, { folder: folderId, orderKey: stored.orderKey });
  await expect
    .poll(async () => (await readPage<{ title: string }>(request, pageId)).title)
    .toBe("Replay Page, autosaved");
});

test("a save of a page without drafts carries the stored folder, orderKey and revision", async ({
  page,
  request,
}) => {
  const folderId = await addFolder(request, "Replay Posts");
  const created = await request.post("/api/posts", {
    data: { folder: folderId, slug: "replay-post", title: "Replay Post" },
  });
  expect(created.ok()).toBe(true);
  const postId = ((await created.json()) as { doc: { id: number; orderKey: string } }).doc.id;
  const stored = (
    (await (await request.get(`/api/posts/${postId}?depth=0`)).json()) as {
      orderKey: string;
    }
  ).orderKey;
  const bodies = recordUpdates(page, "posts", postId);

  await page.goto(`/admin/collections/posts/${postId}`);
  await page.getByTestId("folder-location").waitFor();
  await page.locator("#field-title").fill("Replay Post, saved");
  await page.locator("#action-save").click();

  await expect.poll(() => bodies.length).toBeGreaterThan(0);
  expectStoredStructure(bodies[0], { folder: folderId, orderKey: stored });
  await expect
    .poll(
      async () =>
        ((await (await request.get(`/api/posts/${postId}?depth=0`)).json()) as { title: string })
          .title
    )
    .toBe("Replay Post, saved");
});

test("a folder save from the edit form carries the stored parent, orderKey and revision", async ({
  page,
  request,
}) => {
  const parentId = await addFolder(request, "Replay Parent");
  const childResponse = await request.post("/api/folders", {
    data: { name: "Replay Child", parent: parentId, slug: "replay-child" },
  });
  expect(childResponse.ok()).toBe(true);
  const child = ((await childResponse.json()) as { doc: { id: number } }).doc;
  const stored = (await (await request.get(`/api/folders/${child.id}?depth=0`)).json()) as {
    orderKey: string;
  };
  const bodies = recordUpdates(page, "folders", child.id);

  await page.goto(`/admin/collections/folders/${child.id}`);
  await page.locator("#field-name").fill("Replay Child, renamed");
  await page.locator("#action-save").click();

  await expect.poll(() => bodies.length).toBeGreaterThan(0);
  expectStoredStructure(bodies[0], { orderKey: stored.orderKey, parent: parentId });
  await expect
    .poll(
      async () =>
        ((await (await request.get(`/api/folders/${child.id}?depth=0`)).json()) as { name: string })
          .name
    )
    .toBe("Replay Child, renamed");
});
