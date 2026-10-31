// The REST client of the folders plugin, `@focus-reactive/payload-plugin-folders/rest`. It imports
// no Payload code, so a frontend that only talks to the CMS over HTTP can use it as it is.
import type { PathRow, PathsArgs } from "../core/allPaths.js";
import { toStoryblokFullSlug } from "../core/paths.js";
import type { ResolveArgs, ResolveResult } from "../core/resolve.js";
import type { TreeArgs, TreeNode } from "../core/siteTree.js";

export { toStoryblokFullSlug };
export type { PathRow, ResolveResult, TreeNode };

type FoldersFetch = (input: string, init?: RequestInit) => Promise<Response>;
type HeadersSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

export type FoldersClientOptions = {
  /** Where Payload's API route lives: `/api` unless `routes.api` was changed. */
  apiRoute?: string;
  /** The address of the CMS, such as `https://cms.example.com`. */
  baseUrl: string;
  /** Default: the global `fetch`. */
  fetch?: FoldersFetch;
  /** Sent with every request, for example `{ Authorization: "users API-Key ..." }`. */
  headers?: HeadersSource;
};

export type ClientResolveArgs = Pick<ResolveArgs, "depth" | "draft" | "path"> & {
  locale?: string;
};
export type ClientTreeArgs = Pick<TreeArgs, "depth" | "draft" | "includeEmptyFolders" | "root"> & {
  locale?: string;
};
export type ClientPathsArgs = Pick<PathsArgs, "rootPages" | "under"> & {
  draft?: boolean;
  /** Rows asked for per request while the client collects every page of the answer. Default 1,000. */
  limit?: number;
  locale?: string;
};

export type FoldersClient = {
  /** Every row `getAllPaths` returns, collected over as many requests as it takes. */
  paths: (args?: ClientPathsArgs) => Promise<PathRow[]>;
  /** The same answer as `resolvePath`; a 404 is `{ type: "notFound" }`. */
  resolve: (args: ClientResolveArgs) => Promise<ResolveResult>;
  toStoryblokFullSlug: typeof toStoryblokFullSlug;
  /** The same nodes as `getTree`. */
  tree: (args?: ClientTreeArgs) => Promise<TreeNode[]>;
};

export class FoldersClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FoldersClientError";
    this.status = status;
  }
}

const buildQuery = (
  values: Record<string, boolean | number | string | null | undefined>
): string => {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      query.set(name, String(value));
    }
  }
  const text = query.toString();

  return text === "" ? "" : `?${text}`;
};

const defaultPathsPageSize = 1000;

export const createFoldersClient = ({
  apiRoute = "/api",
  baseUrl,
  fetch: customFetch,
  headers,
}: FoldersClientOptions): FoldersClient => {
  const root = `${baseUrl.replace(/\/+$/u, "")}${apiRoute}/folders-tree`;

  const request = async (
    endpoint: string,
    query: Record<string, boolean | number | string | null | undefined>
  ): Promise<Response> => {
    const sendRequest = customFetch ?? ((input, init) => globalThis.fetch(input, init));
    const resolvedHeaders = typeof headers === "function" ? await headers() : headers;

    return sendRequest(`${root}/${endpoint}${buildQuery(query)}`, {
      headers: { Accept: "application/json", ...Object.fromEntries(new Headers(resolvedHeaders)) },
      method: "GET",
    });
  };

  const readJson = async <TBody>(response: Response, endpoint: string): Promise<TBody> => {
    if (!response.ok) {
      throw new FoldersClientError(
        `folders-tree/${endpoint} answered ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as TBody;
  };

  return {
    paths: async (args = {}) => {
      const rows: PathRow[] = [];
      for (let page = 1; ; page += 1) {
        const answer = await readJson<{ docs: PathRow[]; hasNextPage: boolean }>(
          await request("paths", {
            draft: args.draft,
            limit: args.limit ?? defaultPathsPageSize,
            locale: args.locale,
            page,
            rootPages: args.rootPages,
            under: args.under,
          }),
          "paths"
        );
        rows.push(...answer.docs);
        if (!answer.hasNextPage) {
          return rows;
        }
      }
    },
    resolve: async (args) => {
      const response = await request("resolve", {
        depth: args.depth,
        draft: args.draft,
        locale: args.locale,
        path: args.path,
      });
      if (response.status === 404) {
        // Only the endpoint's own answer is "nothing here": a 404 from a wrong address is an error.
        const body = (await response.json().catch(() => null)) as { type?: unknown } | null;
        if (body?.type === "notFound") {
          return { type: "notFound" };
        }
        throw new FoldersClientError("folders-tree/resolve answered 404", 404);
      }

      return readJson<ResolveResult>(response, "resolve");
    },
    toStoryblokFullSlug,
    tree: async (args = {}) =>
      (
        await readJson<{ nodes: TreeNode[] }>(
          await request("tree", {
            depth: args.depth,
            draft: args.draft,
            includeEmptyFolders: args.includeEmptyFolders,
            locale: args.locale,
            root: args.root,
          }),
          "tree"
        )
      ).nodes,
  };
};
