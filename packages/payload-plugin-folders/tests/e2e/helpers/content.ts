import type { APIRequestContext } from "@playwright/test";

/** A row of `GET /api/folders-tree/children`, the fields the tests read. */
export type ChildRow = {
  collection: string;
  fullPath: string;
  id: number;
  kind: "folder" | "page";
  orderKey: string | null;
  parentId: number | null;
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
  data: { name: string; parent?: number; slug: string }
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
