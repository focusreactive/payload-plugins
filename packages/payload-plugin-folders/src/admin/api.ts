import type { MoveResult } from "../core/applyMove.js";
import type { ExpectedState, MovePreview } from "../core/move.js";
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

/** `truncated` is true when a collection had more candidates than the search reads. */
export type SearchResponse = {
  items: TreeItem[];
  truncated: boolean;
};

export type AncestorFolder = { fullPath: string; id: FolderId; name: string };

export type AncestorsResponse = { folders: AncestorFolder[] };

export type RevisionResponse = { revision: number };

/** An endpoint answered with an error status, or did not answer with the expected JSON. */
export class FoldersApiError extends Error {
  /** Why a move was refused (`stale`, `forbidden`, ...), when the endpoint says. */
  readonly reason: string | null;
  readonly status: number;

  constructor(message: string, status: number, reason: string | null = null) {
    super(message);
    this.name = "FoldersApiError";
    this.reason = reason;
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Payload's error body is `{ errors: [{ message }] }`; anything else gets a generic message. */
const messageOf = (body: unknown, status: number): string => {
  if (isRecord(body) && Array.isArray(body.errors)) {
    const [first] = body.errors as unknown[];
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
    throw new FoldersApiError(messageOf(body, response.status), response.status, reasonOf(body));
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

export type AncestorsQuery = { item: ItemRef; locale?: string | null };

/** The folders above an item, the top one first. */
export const fetchAncestors = (
  context: FoldersApiContext,
  { item, locale }: AncestorsQuery,
  signal?: AbortSignal
): Promise<AncestorsResponse> =>
  getJson<AncestorsResponse>(
    context,
    "ancestors",
    { collection: item.collection, id: String(item.id), locale },
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
 * it) or an item to land after. `redirects: false` is sent only when the editor unticked it.
 */
export type MoveBody = {
  items: MoveItemBody[];
  redirects?: boolean;
} & (
  | { after: ItemRef; position?: undefined; toFolder?: undefined }
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
