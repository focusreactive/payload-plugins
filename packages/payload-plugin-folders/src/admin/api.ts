import type { MoveResult } from "../core/applyMove.js";
import type { DeletePreview, DeleteResult } from "../core/deleteItems.js";
import type { DuplicateResult } from "../core/duplicate.js";
import type { ExpectedState, MoveAnchor, MovePreview } from "../core/move.js";
import type { OperationKind, OperationProgress } from "../core/operations.js";
import type { RepairResult } from "../core/repair.js";
import type { VerifyResult } from "../core/verify.js";
import type { PublishAction, PublishPreview, PublishResult } from "../core/publish.js";
import { redirectsParameter } from "../core/redirectsOptOut.js";
import { isPageChangedMessage, rootPreconditionParameter } from "../core/rootPrecondition.js";
import type { FolderId, ItemRef, TreeItem, TreeStatus } from "../types.js";

/** Where the plugin's endpoints live and how to call them. */
export type FoldersApiContext = {
  /** The API root including the route prefix, such as `/api` or `https://cms.example.com/api`. */
  baseUrl: string;
  /** For tests; the browser's `fetch` by default. */
  fetchImplementation?: typeof fetch;
};

export type ChildrenResponse = {
  hasMore: boolean;
  items: TreeItem[];
  nextCursor: string | null;
  revision: number;
};

/**
 * `truncated` is true when a collection had more candidates than the search reads; `folders` names
 * the folders above the hits by id, for each hit's breadcrumb.
 */
export type SearchResponse = {
  folders: Record<string, string>;
  items: TreeItem[];
  truncated: boolean;
};

export type AncestorFolder = { fullPath: string; id: FolderId; name: string };

/**
 * `items` and `item` come with `withItems`: the tree rows of `folders` in the same order, and a
 * folder's own row.
 */
export type AncestorsResponse = { folders: AncestorFolder[]; item?: TreeItem; items?: TreeItem[] };

export type RevisionResponse = { revision: number };

/** An endpoint answered with an error status, or did not answer with the expected JSON. */
export class FoldersApiError extends Error {
  /**
   * What the refusal carries beyond its reason (`items` of a refused delete, `confirmWord`), from
   * `errors[0].data`; `null` when the endpoint sends none.
   */
  readonly data: Record<string, unknown> | null;
  /** Why a move was refused (`stale`, `forbidden`, ...), when the endpoint says. */
  readonly reason: string | null;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    reason: string | null = null,
    data: Record<string, unknown> | null = null
  ) {
    super(message);
    this.name = "FoldersApiError";
    this.data = data;
    this.reason = reason;
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Payload's error body is `{ errors: [{ message }] }`. A validation error's own message only says
 * which field is invalid, so the first field message in `data.errors` is the better one to show.
 */
const messageOf = (body: unknown, status: number): string => {
  if (isRecord(body) && Array.isArray(body.errors)) {
    const [first] = body.errors as unknown[];
    if (isRecord(first) && isRecord(first.data) && Array.isArray(first.data.errors)) {
      const [field] = first.data.errors as unknown[];
      if (isRecord(field) && typeof field.message === "string") {
        return field.message;
      }
    }
    if (isRecord(first) && typeof first.message === "string") {
      return first.message;
    }
  }

  return `The request failed with status ${status}`;
};

/** The refusal reason a move endpoint puts in `errors[0].data.reason`. */
const reasonOf = (body: unknown): string | null => {
  if (isRecord(body) && Array.isArray(body.errors)) {
    const [first] = body.errors as unknown[];
    if (isRecord(first) && isRecord(first.data) && typeof first.data.reason === "string") {
      return first.data.reason;
    }
  }

  return null;
};

/** The `errors[0].data` object of an error body: the refusal's own details. */
const dataOf = (body: unknown): Record<string, unknown> | null => {
  if (isRecord(body) && Array.isArray(body.errors)) {
    const [first] = body.errors as unknown[];
    if (isRecord(first) && isRecord(first.data)) {
      return first.data;
    }
  }

  return null;
};

const buildQuery = (query: Record<string, string | number | null | undefined>): string => {
  const parameters = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      parameters.set(name, String(value));
    }
  }
  const text = parameters.toString();

  return text === "" ? "" : `?${text}`;
};

const readJsonResponse = async <Response>(response: globalThis.Response): Promise<Response> => {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // The status below says what went wrong when the body is not JSON.
  }
  if (!response.ok) {
    throw new FoldersApiError(
      messageOf(body, response.status),
      response.status,
      reasonOf(body),
      dataOf(body)
    );
  }

  return body as Response;
};

const getJson = async <Response>(
  context: FoldersApiContext,
  path: string,
  query: Record<string, string | number | null | undefined> = {},
  signal?: AbortSignal
): Promise<Response> => {
  const send = context.fetchImplementation ?? fetch;
  const response = await send(`${context.baseUrl}/folders-tree/${path}${buildQuery(query)}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    method: "GET",
    signal,
  });

  return readJsonResponse<Response>(response);
};

const postJson = async <Response>(
  context: FoldersApiContext,
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<Response> => {
  const send = context.fetchImplementation ?? fetch;
  const response = await send(`${context.baseUrl}/folders-tree/${path}`, {
    body: JSON.stringify(body),
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
    signal,
  });

  return readJsonResponse<Response>(response);
};

export type ChildrenQuery = {
  cursor?: string | null;
  limit?: number;
  locale?: string | null;
  /** `null` is the top level of the tree. */
  parent: FolderId | null;
};

/** One page of the folders and pages directly inside a folder, in tree order. */
export const fetchChildren = (
  context: FoldersApiContext,
  { cursor, limit, locale, parent }: ChildrenQuery,
  signal?: AbortSignal
): Promise<ChildrenResponse> =>
  getJson<ChildrenResponse>(
    context,
    "children",
    { cursor, limit, locale, parent: parent === null ? "root" : String(parent) },
    signal
  );

export type SearchQuery = {
  /** The zoomed folder; `null` is the top level. */
  folder: FolderId | null;
  limit?: number;
  locale?: string | null;
  query: string;
  scope?: "all" | "folder";
  status?: TreeStatus[];
  /** Collection slugs. */
  types?: string[];
};

export const fetchSearch = (
  context: FoldersApiContext,
  { folder, limit, locale, query, scope, status, types }: SearchQuery,
  signal?: AbortSignal
): Promise<SearchResponse> =>
  getJson<SearchResponse>(
    context,
    "search",
    {
      folder: folder === null ? "root" : String(folder),
      limit,
      locale,
      q: query,
      scope,
      status: status?.join(","),
      types: types?.join(","),
    },
    signal
  );

export type AncestorsQuery = {
  item: ItemRef;
  locale?: string | null;
  /** Also answer the tree rows of the folders and of the item itself, for the zoomed view. */
  withItems?: boolean;
};

/** The folders above an item, the top one first. */
export const fetchAncestors = (
  context: FoldersApiContext,
  { item, locale, withItems }: AncestorsQuery,
  signal?: AbortSignal
): Promise<AncestorsResponse> =>
  getJson<AncestorsResponse>(
    context,
    "ancestors",
    {
      collection: item.collection,
      id: String(item.id),
      locale,
      withItems: withItems ? 1 : undefined,
    },
    signal
  );

/** The number the store polls to learn that the tree changed. */
export const fetchRevision = (
  context: FoldersApiContext,
  signal?: AbortSignal
): Promise<RevisionResponse> => getJson<RevisionResponse>(context, "revision", {}, signal);

/** One item of a move request; `expected` is what the editor saw, so a changed tree answers 409. */
export type MoveItemBody = ItemRef & { expected?: ExpectedState };

/**
 * The body of `POST /move` and `POST /move/preview`: the items, then either a folder (and where in
 * it) or an item to land after. An `after` item always carries `expected: { parentId }`, the folder
 * the editor saw it in, so a sibling that moved on makes the move stale instead of landing next to
 * it in a folder nobody looked at. `redirects: false` is sent only when the editor unticked it.
 */
export type MoveBody = {
  items: MoveItemBody[];
  redirects?: boolean;
} & (
  | { after: MoveAnchor; position?: undefined; toFolder?: undefined }
  | { after?: undefined; position?: "end" | "start"; toFolder: FolderId | null }
);

/** What `POST /move` would do, without writing; a move that cannot happen is `ok: false`. */
export const previewMove = (
  context: FoldersApiContext,
  body: MoveBody,
  signal?: AbortSignal
): Promise<MovePreview> => postJson<MovePreview>(context, "move/preview", body, signal);

/** Moves the items in one request. A refused move throws a `FoldersApiError` with its reason. */
export const postMove = (context: FoldersApiContext, body: MoveBody): Promise<MoveResult> =>
  postJson<MoveResult>(context, "move", body);

export type { MovePreview, MoveResult };

export type SegmentCheckResponse = {
  /** What holds the path when it is taken: a folder or a page. */
  conflict?: { kind: "folder" | "page"; path: string };
  message?: string;
  ok: boolean;
};

/** Whether `segment` is free in a folder (`null` is the top level), for the create dialogs. */
export const fetchCheckSegment = (
  context: FoldersApiContext,
  {
    exclude,
    locale,
    parent,
    segment,
  }: { exclude?: ItemRef; locale?: string | null; parent: FolderId | null; segment: string },
  signal?: AbortSignal
): Promise<SegmentCheckResponse> =>
  getJson<SegmentCheckResponse>(
    context,
    "check-segment",
    {
      exclude: exclude === undefined ? undefined : `${exclude.collection}:${exclude.id}`,
      locale,
      parent: parent === null ? "root" : String(parent),
      segment,
    },
    signal
  );

export type RootCheckResponse = {
  /** The page that holds, or is about to hold, the root page place of the folder. */
  conflict?: { path: string; title: string };
  message?: string;
  ok: boolean;
};

/**
 * Whether another page already is, or in its latest version is about to be, the root page of a
 * folder (`null` is the top level): the edit view's draft warning and its disabled checkbox.
 */
export const fetchCheckRoot = (
  context: FoldersApiContext,
  {
    exclude,
    locale,
    parent,
  }: { exclude?: ItemRef; locale?: string | null; parent: FolderId | null },
  signal?: AbortSignal
): Promise<RootCheckResponse> =>
  getJson<RootCheckResponse>(
    context,
    "check-root",
    {
      exclude: exclude === undefined ? undefined : `${exclude.collection}:${exclude.id}`,
      locale,
      parent: parent === null ? "root" : String(parent),
    },
    signal
  );

/** The host's "View page" link for a page's path. */
export const fetchPreviewUrl = (
  context: FoldersApiContext,
  { collection, fullPath, locale }: { collection: string; fullPath: string; locale?: string | null }
): Promise<{ url: string }> =>
  getJson<{ url: string }>(context, "preview-url", { collection, fullPath, locale });

/**
 * A write through Payload's own REST routes (`/api/pages/41`, `/api/folders`): the create dialogs
 * and Set as root page use them, so the collection's hooks, access and validation all apply.
 * `doc` is what Payload answers with.
 */
export const writeDocument = async <Doc = { id: FolderId }>(
  context: FoldersApiContext,
  {
    body,
    collection,
    id,
    query = {},
  }: {
    body: unknown;
    collection: string;
    /** Present for an update (PATCH), absent for a create (POST). */
    id?: FolderId;
    query?: Record<string, string | number | null | undefined>;
  }
): Promise<{ doc: Doc }> => {
  const send = context.fetchImplementation ?? fetch;
  const response = await send(
    `${context.baseUrl}/${collection}${id === undefined ? "" : `/${id}`}${buildQuery(query)}`,
    {
      body: JSON.stringify(body),
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: id === undefined ? "POST" : "PATCH",
    }
  );

  return readJsonResponse<{ doc: Doc }>(response);
};

/**
 * The documents of a collection made in a folder since `since`, newest first, read through
 * Payload's own REST route. The create drawer of a collection with autosave finds the draft its
 * opening made with this; the caller picks the one that is its own.
 */
export const fetchRecentDocuments = async <Doc extends { id: FolderId }>(
  context: FoldersApiContext,
  { collection, folder, since }: { collection: string; folder: FolderId | null; since: Date }
): Promise<Doc[]> => {
  const send = context.fetchImplementation ?? fetch;
  const parameters = new URLSearchParams({
    depth: "0",
    limit: "20",
    sort: "-createdAt",
  });
  parameters.set("where[and][0][createdAt][greater_than_equal]", since.toISOString());
  if (folder === null) {
    parameters.set("where[and][1][folder][exists]", "false");
  } else {
    parameters.set("where[and][1][folder][equals]", String(folder));
  }
  const response = await send(`${context.baseUrl}/${collection}?${parameters.toString()}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    method: "GET",
  });
  const body = await readJsonResponse<{ docs?: Doc[] }>(response);

  return body.docs ?? [];
};

/**
 * Deletes one document through Payload's own REST route, for a document nobody has kept (the
 * draft a cancelled create drawer left behind). Payload's `DELETE` removes it for good, also from a
 * collection with a trash, which is right for something that was never saved by hand.
 */
export const deleteDocument = async (
  context: FoldersApiContext,
  { collection, id }: { collection: string; id: FolderId }
): Promise<void> => {
  const send = context.fetchImplementation ?? fetch;
  const response = await send(`${context.baseUrl}/${collection}/${id}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    method: "DELETE",
  });
  await readJsonResponse<unknown>(response);
};

/**
 * The page's latest saved state, drafts included, read straight from Payload's REST route. The tree
 * rows are read earlier and a draft save never bumps the tree revision, so a row's status can be
 * stale; this is the answer to "is there a draft nobody has published?" right now.
 */
export const fetchLatestStatus = async (
  context: FoldersApiContext,
  { collection, id }: { collection: string; id: FolderId }
): Promise<{ _status?: string }> => {
  const send = context.fetchImplementation ?? fetch;
  const response = await send(
    `${context.baseUrl}/${collection}/${id}${buildQuery({ depth: 0, draft: "true" })}`,
    { credentials: "include", headers: { Accept: "application/json" }, method: "GET" }
  );

  return readJsonResponse<{ _status?: string }>(response);
};

/**
 * The query a folder save sends so the server writes no redirect rows (`redirectsParameter`):
 * empty when the editor left the redirect box ticked, which is the server's default.
 */
export const redirectsQueryOf = (redirects: boolean): Record<string, string> =>
  redirects ? {} : { [redirectsParameter]: "false" };

/**
 * The query a partial root save sends so the server refuses it when the page changed after this
 * read (`rootPreconditionParameter`); empty when the page has no `updatedAt` to compare.
 */
export const preconditionQueryOf = (marker: string | undefined): Record<string, string> =>
  marker === undefined ? {} : { [rootPreconditionParameter]: marker };

/**
 * The `updatedAt` of the page's latest version, the marker a partial save sends back as its
 * precondition. A collection with drafts answers from its newest version row (`latest`), the very
 * row the server reads as the page's current state, so a draft saved in a locale other than the
 * admin's still changes it; a collection without drafts has the row itself. Read it before the
 * status and before any confirmation: whatever changes the page after it makes the save fail.
 */
export const fetchVersionMarker = async (
  context: FoldersApiContext,
  { collection, hasDrafts, id }: { collection: string; hasDrafts: boolean; id: FolderId }
): Promise<string | undefined> => {
  const send = context.fetchImplementation ?? fetch;
  if (hasDrafts) {
    const response = await send(
      `${context.baseUrl}/${collection}/versions${buildQuery({
        depth: 0,
        limit: 1,
        sort: "-updatedAt",
        "where[latest][equals]": "true",
        "where[parent][equals]": String(id),
      })}`,
      { credentials: "include", headers: { Accept: "application/json" }, method: "GET" }
    );
    const { docs } = await readJsonResponse<{ docs: Array<{ version?: { updatedAt?: string } }> }>(
      response
    );
    const marker = docs[0]?.version?.updatedAt;
    if (typeof marker === "string") {
      return marker;
    }
  }
  const response = await send(`${context.baseUrl}/${collection}/${id}${buildQuery({ depth: 0 })}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    method: "GET",
  });
  const { updatedAt } = await readJsonResponse<{ updatedAt?: string }>(response);

  return typeof updatedAt === "string" ? updatedAt : undefined;
};

/** The refusal of a root save whose page changed after the admin read it. */
export const isPageChangedError = (error: unknown): boolean =>
  error instanceof FoldersApiError && isPageChangedMessage(error.message);

/**
 * One document as Payload's REST route answers it: the latest version, drafts included (or the live
 * row with `draft: false`), and only the values the locale has of its own (`fallback-locale=none`),
 * so a settings form shows what an edit would change and not what falls back. `fallback: true` reads
 * what the locale shows, which is what its URL is made of.
 */
export const fetchDocument = async <Doc>(
  context: FoldersApiContext,
  {
    collection,
    draft = true,
    fallback = false,
    id,
    locale,
  }: {
    collection: string;
    draft?: boolean;
    fallback?: boolean;
    id: FolderId;
    locale?: string | null;
  }
): Promise<Doc> => {
  const send = context.fetchImplementation ?? fetch;
  const response = await send(
    `${context.baseUrl}/${collection}/${id}${buildQuery({
      depth: 0,
      draft: draft ? "true" : undefined,
      "fallback-locale": fallback ? undefined : "none",
      locale,
    })}`,
    { credentials: "include", headers: { Accept: "application/json" }, method: "GET" }
  );

  return readJsonResponse<Doc>(response);
};

/** How many folders sit anywhere below a folder, for the lock confirmation. */
export const fetchSubfolderCount = async (
  context: FoldersApiContext,
  { foldersSlug, id }: { foldersSlug: string; id: FolderId }
): Promise<number> => {
  const send = context.fetchImplementation ?? fetch;
  const response = await send(
    `${context.baseUrl}/${foldersSlug}${buildQuery({
      depth: 0,
      limit: 1,
      "select[id]": "true",
      "where[ancestorIds][contains]": `/${id}/`,
    })}`,
    { credentials: "include", headers: { Accept: "application/json" }, method: "GET" }
  );

  return (await readJsonResponse<{ totalDocs: number }>(response)).totalDocs;
};

/** The old path of a URL history row. */
export type UrlHistoryEntry = {
  createdAt: string;
  fromPath: string;
  id: FolderId;
  kind: "folderPrefix" | "page";
  locale: string | null;
};

/** The URL history rows that point at one document, newest first. */
export const fetchUrlHistory = async (
  context: FoldersApiContext,
  { collection, id }: { collection: string; id: FolderId }
): Promise<UrlHistoryEntry[]> => {
  const send = context.fetchImplementation ?? fetch;
  const response = await send(
    `${context.baseUrl}/folder-redirects${buildQuery({
      depth: 0,
      limit: 50,
      sort: "-createdAt",
      "where[target.relationTo][equals]": collection,
      "where[target.value][equals]": String(id),
    })}`,
    { credentials: "include", headers: { Accept: "application/json" }, method: "GET" }
  );

  return (await readJsonResponse<{ docs: UrlHistoryEntry[] }>(response)).docs;
};

export type FolderPreviewBody = { locale?: string | null; parent?: FolderId | null; slug?: string };

/** What saving a rename of one folder would change, without writing. */
export const previewFolderEdit = (
  context: FoldersApiContext,
  id: FolderId,
  body: FolderPreviewBody
): Promise<MovePreview> =>
  postJson<MovePreview>(context, `folders/${id}/preview`, {
    ...(body.slug === undefined ? {} : { slug: body.slug }),
    ...(body.parent === undefined ? {} : { parent: body.parent }),
    ...(body.locale ? { locale: body.locale } : {}),
  });

export type { DeletePreview, DeleteResult, DuplicateResult, PublishPreview, PublishResult };

/** One selected item as the publish, duplicate and delete endpoints take it. */
export type ItemBody = ItemRef;

export type PublishBody = {
  action: PublishAction;
  items: ItemBody[];
  locale?: string | null;
};

const publishRequestOf = ({ action, items, locale }: PublishBody) => ({
  action,
  items,
  ...(locale ? { locale } : {}),
});

/** The counts the Publish dialog states; nothing is written (`dryRun`). */
export const previewPublish = (
  context: FoldersApiContext,
  body: PublishBody,
  signal?: AbortSignal
): Promise<PublishPreview> =>
  postJson<PublishPreview>(context, "publish", { ...publishRequestOf(body), dryRun: true }, signal);

/** Publishes or unpublishes; above the synchronous limit the answer is an operation to step. */
export const postPublish = (
  context: FoldersApiContext,
  body: PublishBody
): Promise<PublishResult> => postJson<PublishResult>(context, "publish", publishRequestOf(body));

export type DuplicateBody = {
  items: ItemBody[];
  /** The admin locale: the name and segment of a single copy are written in it. */
  locale?: string | null;
  overrides?: { name?: string; slug?: string };
  /** `null` is the top level; left out, a single item is copied beside the original. */
  toFolder?: FolderId | null;
};

export const postDuplicate = (
  context: FoldersApiContext,
  { locale, ...body }: DuplicateBody
): Promise<DuplicateResult> =>
  postJson<DuplicateResult>(context, `duplicate${buildQuery({ locale })}`, body);

/** What a delete would remove, and the word the dialog asks for above 10 pages. */
export const previewDelete = (
  context: FoldersApiContext,
  items: ItemBody[],
  signal?: AbortSignal
): Promise<DeletePreview> => postJson<DeletePreview>(context, "delete/preview", { items }, signal);

export const postDelete = (
  context: FoldersApiContext,
  { confirmWord, items }: { confirmWord?: string; items: ItemBody[] }
): Promise<DeleteResult> =>
  postJson<DeleteResult>(context, "delete", {
    ...(confirmWord === undefined ? {} : { confirmWord }),
    items,
  });

/** Processes the next slice of a stepped operation; a failed step answers `status: "failed"`. */
export const postOperationStep = (
  context: FoldersApiContext,
  id: FolderId
): Promise<OperationProgress> => postJson<OperationProgress>(context, `operations/${id}/step`, {});

/**
 * Gives up on a failed operation: it takes no more steps and what it did stays. Answers how far it
 * got, with status `abandoned`.
 */
export const postOperationAbandon = (
  context: FoldersApiContext,
  id: FolderId
): Promise<OperationProgress> =>
  postJson<OperationProgress>(context, `operations/${id}/abandon`, {});

/** An operation as the progress dialog and the banner show it. */
export type OperationSummary = {
  done: number;
  error?: string;
  id: FolderId;
  kind: OperationKind;
  status: OperationProgress["status"];
  total: number;
};

/** How long an unfinished operation stays worth resuming: older ones are left alone. */
export const resumableOperationAgeMs = 24 * 60 * 60 * 1000;

/**
 * The signed-in user's operations that are still running or failed, newest first, read through Payload's own REST
 * route. The work list (`items`) is left out of the read, because it holds one entry per document.
 */
export const fetchUnfinishedOperations = async (
  context: FoldersApiContext,
  { now = new Date(), userId }: { now?: Date; userId: FolderId }
): Promise<OperationSummary[]> => {
  const send = context.fetchImplementation ?? fetch;
  const since = new Date(now.getTime() - resumableOperationAgeMs).toISOString();
  const response = await send(
    `${context.baseUrl}/folder-operations${buildQuery({
      depth: 0,
      limit: 10,
      "select[done]": "true",
      "select[error]": "true",
      "select[kind]": "true",
      "select[status]": "true",
      "select[total]": "true",
      sort: "-createdAt",
      "where[and][0][createdBy][equals]": String(userId),
      "where[and][1][status][in]": "running,failed",
      "where[and][2][updatedAt][greater_than]": since,
    })}`,
    { credentials: "include", headers: { Accept: "application/json" }, method: "GET" }
  );
  const { docs } = await readJsonResponse<{
    docs: Array<{
      done?: number;
      error?: string | null;
      id: FolderId;
      kind: OperationKind;
      status: OperationProgress["status"];
      total?: number;
    }>;
  }>(response);

  return docs.map((doc) => ({
    done: doc.done ?? 0,
    ...(doc.error ? { error: doc.error } : {}),
    id: doc.id,
    kind: doc.kind,
    status: doc.status,
    total: doc.total ?? 0,
  }));
};

/**
 * The quick verify answer: the verify result of the folder rows, and whether the user may repair.
 * `issues` is left out for a user who cannot repair: the banner needs only the counts.
 */
export type QuickVerifyResponse = Omit<VerifyResult, "issues"> &
  Partial<Pick<VerifyResult, "issues">> & { canRepair: boolean };

/** One query of the folder rows: does any folder's path, ancestry or depth disagree with its parent chain. */
export const fetchQuickVerify = (
  context: FoldersApiContext,
  signal?: AbortSignal
): Promise<QuickVerifyResponse> =>
  getJson<QuickVerifyResponse>(context, "verify", { quick: 1 }, signal);

/** Rebuilds the full URLs; with `dryRun` it only reports what it would fix and what it leaves. */
export const postRepair = (
  context: FoldersApiContext,
  { dryRun }: { dryRun: boolean },
  signal?: AbortSignal
): Promise<RepairResult> =>
  postJson<RepairResult>(context, "repair", dryRun ? { dryRun } : {}, signal);
