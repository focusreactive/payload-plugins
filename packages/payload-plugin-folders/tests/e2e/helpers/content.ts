import type { APIRequestContext } from "@playwright/test";

/** A row of `GET /api/folders-tree/children`, the fields the tests read. */
export type ChildRow = {
  collection: string;
  fullPath: string;
  id: number;
  kind: "folder" | "page";
  orderKey: string | null;
  parentId: number | null;
  /** Pages only. */
  status?: string;
  title: string;
};

const expectOk = async (
  response: Awaited<ReturnType<APIRequestContext["get"]>>,
  what: string
): Promise<void> => {
  if (!response.ok()) {
    throw new Error(`${what} failed with status ${response.status()}: ${await response.text()}`);
  }
};

/** Creates a top-level folder (or one inside `parent`) through the REST API, as the dev admin. */
export const createFolder = async (
  request: APIRequestContext,
  data: {
    allowedTypes?: string[];
    lockSubfolderTypes?: boolean;
    name: string;
    parent?: number;
    slug: string;
  }
): Promise<number> => {
  const response = await request.post("/api/folders", { data });
  await expectOk(response, `Creating folder ${data.name}`);

  return ((await response.json()) as { doc: { id: number } }).doc.id;
};

/** Creates a published page in a folder; synthetic content only. */
export const createPage = async (
  request: APIRequestContext,
  data: { folder: number; slug: string; title: string; status?: "draft" | "published" }
): Promise<number> => {
  const response = await request.post(`/api/pages${data.status === "draft" ? "?draft=true" : ""}`, {
    data: {
      _status: data.status ?? "published",
      folder: data.folder,
      slug: data.slug,
      title: data.title,
    },
  });
  await expectOk(response, `Creating page ${data.title}`);

  return ((await response.json()) as { doc: { id: number } }).doc.id;
};

export const deletePage = async (request: APIRequestContext, id: number): Promise<void> => {
  await expectOk(await request.delete(`/api/pages/${id}`), `Deleting page ${id}`);
};

export const deleteFolder = async (request: APIRequestContext, id: number): Promise<void> => {
  await expectOk(await request.delete(`/api/folders/${id}`), `Deleting folder ${id}`);
};

/** The rows inside a folder in tree order, straight from the endpoint the tree reads. */
export const childrenOf = async (
  request: APIRequestContext,
  parent: number | "root"
): Promise<ChildRow[]> => {
  const response = await request.get(`/api/folders-tree/children?parent=${parent}&limit=200`);
  await expectOk(response, `Reading the children of ${parent}`);

  return ((await response.json()) as { items: ChildRow[] }).items;
};

/** The URL history rows whose old path is `fromPath`. */
export const redirectsFrom = async (
  request: APIRequestContext,
  fromPath: string
): Promise<number> => {
  const response = await request.get(
    `/api/folder-redirects?where[fromPath][equals]=${encodeURIComponent(fromPath)}&limit=10`
  );
  await expectOk(response, `Reading redirects from ${fromPath}`);

  return ((await response.json()) as { totalDocs: number }).totalDocs;
};

/** The rows of `@payloadcms/plugin-redirects` (the mirror's) whose `from` is `from`. */
export const mirrorRowsFrom = async (request: APIRequestContext, from: string): Promise<number> => {
  const response = await request.get(
    `/api/redirects?where[from][equals]=${encodeURIComponent(from)}&limit=10`
  );
  await expectOk(response, `Reading mirror rows from ${from}`);

  return ((await response.json()) as { totalDocs: number }).totalDocs;
};

/** Deletes a folder with everything inside it, the deepest rows first. */
export const removeFolderTree = async (
  request: APIRequestContext,
  folderId: number
): Promise<void> => {
  for (const row of await childrenOf(request, folderId)) {
    if (row.kind === "folder") {
      await removeFolderTree(request, row.id);
    } else {
      await request.delete(`/api/${row.collection}/${row.id}`);
    }
  }
  await request.delete(`/api/folders/${folderId}`);
};

/** A page as Payload's REST route answers it: the live row, or the latest version with `draft`. */
export const readPage = async <Doc = Record<string, unknown>>(
  request: APIRequestContext,
  id: number,
  { collection = "pages", draft = false }: { collection?: string; draft?: boolean } = {}
): Promise<Doc> => {
  const response = await request.get(
    `/api/${collection}/${id}?depth=0${draft ? "&draft=true" : ""}`
  );
  await expectOk(response, `Reading page ${id}`);

  return (await response.json()) as Doc;
};

/** Creates a post, which the dev app keeps without drafts, so it is always live. */
export const createPost = async (
  request: APIRequestContext,
  data: { folder: number; slug: string; title: string }
): Promise<number> => {
  const response = await request.post("/api/posts", { data });
  await expectOk(response, `Creating post ${data.title}`);

  return ((await response.json()) as { doc: { id: number } }).doc.id;
};

/** How many documents of a collection sit directly in a folder, optionally with one `_status`. */
export const countIn = async (
  request: APIRequestContext,
  { collection, folder, status }: { collection: string; folder: number; status?: string }
): Promise<number> => {
  const statusQuery = status === undefined ? "" : `&where[_status][equals]=${status}`;
  const response = await request.get(
    `/api/${collection}?limit=1&depth=0&where[folder][equals]=${folder}${statusQuery}`
  );
  await expectOk(response, `Counting ${collection} in folder ${folder}`);

  return ((await response.json()) as { totalDocs: number }).totalDocs;
};

/**
 * Deletes a folder with everything in it through the plugin's own delete, stepping the operation a
 * large one becomes until it is done: 2,000 REST deletes would take minutes.
 */
export const deleteFolderWithContent = async (
  request: APIRequestContext,
  { confirmWord, folder }: { confirmWord: string; folder: number }
): Promise<void> => {
  const response = await request.post("/api/folders-tree/delete", {
    data: { confirmWord, items: [{ collection: "folders", id: folder }] },
  });
  await expectOk(response, `Deleting folder ${folder} with its content`);
  const result = (await response.json()) as { operationId?: number };
  if (result.operationId === undefined) {
    return;
  }
  for (;;) {
    const step = await request.post(`/api/folders-tree/operations/${result.operationId}/step`);
    await expectOk(step, `Stepping operation ${result.operationId}`);
    const { error, status } = (await step.json()) as { error?: string; status: string };
    if (status === "done") {
      return;
    }
    if (status === "failed") {
      throw new Error(`Operation ${result.operationId} failed: ${error ?? "no message"}`);
    }
  }
};
