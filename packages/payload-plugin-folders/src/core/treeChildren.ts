import { APIError, NotFound } from "payload";
import type { PayloadRequest, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { getResolvedOptions } from "./runtime.js";
import type { FolderId, ResolvedOptions, TreeItem } from "../types.js";
import { toFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import { compareSiblings } from "./orderKeys.js";
import type { SiblingRow } from "./orderKeys.js";
import {
  buildSources,
  buildTreeItems,
  maxTreePageSize,
  pageSelect,
  resolveViewLocale,
  sourceClauses,
} from "./treeItems.js";
import type { TreeRow, TreeSource } from "./treeItems.js";
import { readRevision } from "./treeLock.js";

export type ChildrenArgs = {
  /** An opaque `nextCursor` of an earlier answer. */
  cursor?: string | null;
  /** Default `admin.pageSize`, at most 1000. */
  limit?: number;
  /** The locale titles and paths are shown in. Default: the default locale. */
  locale?: string | null;
  /** The folder whose children to list; `null` is the top level. */
  parent: FolderId | null;
};

export type ChildrenResult = {
  hasMore: boolean;
  items: TreeItem[];
  nextCursor: string | null;
  revision: number;
};

type Phase = "keyed" | "unkeyed";

/** Where the last row of the previous page sat: its sort value and its place among the sources. */
type CursorPosition = {
  collection: string;
  id: FolderId;
  kind: "folder" | "page";
  phase: Phase;
  /** The row's `orderKey` in the keyed phase, its `createdAt` in the unkeyed one. */
  value: string;
};

const badRequest = (message: string): APIError => new APIError(message, 400, null, true);

export const encodeCursor = (position: CursorPosition): string =>
  Buffer.from(JSON.stringify(position)).toString("base64url");

/** Validates everything a cursor names, because its values go into a query. */
export const decodeCursor = (cursor: string, options: ResolvedOptions): CursorPosition => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  } catch {
    throw badRequest("`cursor` is not a cursor this endpoint gave out");
  }
  const candidate = parsed as Partial<CursorPosition> | null;
  const isKnownCollection =
    typeof candidate?.collection === "string" &&
    (candidate.collection === options.folders.slug || candidate.collection in options.collections);
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !isKnownCollection ||
    (candidate.kind !== "folder" && candidate.kind !== "page") ||
    (candidate.phase !== "keyed" && candidate.phase !== "unkeyed") ||
    typeof candidate.value !== "string" ||
    (typeof candidate.id !== "number" && typeof candidate.id !== "string")
  ) {
    throw badRequest("`cursor` is not a cursor this endpoint gave out");
  }

  return candidate as CursorPosition;
};

/** The order sources sort in when their rows tie: folders first, then collection slug (`compareSiblings`). */
const compareSources = (
  left: { collection: string; kind: "folder" | "page" },
  right: { collection: string; kind: "folder" | "page" }
): number => {
  if (left.kind !== right.kind) {
    return left.kind === "folder" ? -1 : 1;
  }
  if (left.collection === right.collection) {
    return 0;
  }

  return left.collection < right.collection ? -1 : 1;
};

/**
 * The rows of `source` that sort after `cursor`. Rows tie on the sort value only between sources
 * (equal keys are repaired away inside one), so a source that sorts before the cursor's takes
 * strictly greater values, one that sorts after takes equal ones too, and the cursor's own source
 * breaks the tie by id. That makes the page boundary exact whatever is inserted or moved
 * meanwhile.
 */
const afterCursor = (source: TreeSource, cursor: CursorPosition): Where => {
  const field = cursor.phase === "keyed" ? "orderKey" : "createdAt";
  const order = compareSources(source, cursor);
  if (order < 0) {
    return { [field]: { greater_than: cursor.value } };
  }
  if (order > 0) {
    return { [field]: { greater_than_equal: cursor.value } };
  }

  return {
    or: [
      { [field]: { greater_than: cursor.value } },
      { and: [{ [field]: { equals: cursor.value } }, { id: { greater_than: cursor.id } }] },
    ],
  };
};

const toSiblingRow = (row: TreeRow): SiblingRow & TreeRow => ({
  ...row,
  collection: row.source.collection,
  createdAt: typeof row.doc.createdAt === "string" ? row.doc.createdAt : null,
  id: row.doc.id as FolderId,
  kind: row.source.kind,
  orderKey: typeof row.doc.orderKey === "string" ? row.doc.orderKey : null,
});

/**
 * Up to `want` rows of one phase across every source, in tree order: one query per source. The
 * keyed rows are asked for with `orderKey exists`, the unkeyed with `orderKey` missing, so null
 * ordering never depends on the database (spec section 5.9).
 */
const readPhase = async ({
  after,
  parent,
  phase,
  req,
  sources,
  want,
}: {
  after: CursorPosition | null;
  parent: FolderId | null;
  phase: Phase;
  req: PayloadRequest;
  sources: TreeSource[];
  want: number;
}): Promise<Array<SiblingRow & TreeRow>> => {
  const field = phase === "keyed" ? "orderKey" : "createdAt";
  const rows: Array<SiblingRow & TreeRow> = [];

  for (const source of sources) {
    if (!source.scope.isAllowed) {
      continue;
    }
    const { docs } = await req.payload.db.find({
      collection: toCollectionSlug(source.collection),
      limit: want,
      locale: "all",
      pagination: false,
      req,
      ...(source.kind === "page" ? { select: pageSelect(source) } : {}),
      sort: [field, "id"],
      where: {
        and: [
          { [source.parentField]: { equals: parent } },
          { orderKey: { exists: phase === "keyed" } },
          ...sourceClauses(req, source),
          ...(after && after.phase === phase ? [afterCursor(source, after)] : []),
        ],
      },
    });
    for (const doc of docs as Array<Record<string, unknown>>) {
      rows.push(toSiblingRow({ doc, source }));
    }
  }

  // The first `want` of the merge are right even though every source gave `want`: a row among them
  // has fewer than `want` rows before it in its own source.
  return rows.sort(compareSiblings).slice(0, want);
};

const readParent = async ({
  parent,
  req,
  source,
}: {
  parent: FolderId;
  req: PayloadRequest;
  source: TreeSource;
}): Promise<FolderRecord> => {
  // A user who cannot read folders learns nothing, not even whether the folder exists.
  const row = source.scope.isAllowed
    ? ((await req.payload.db.findOne({
        collection: toCollectionSlug(source.collection),
        locale: "all",
        req,
        where: { and: [{ id: { equals: parent } }, ...sourceClauses(req, source)] },
      })) as Record<string, unknown> | null)
    : null;
  if (!row) {
    throw new NotFound(req.t);
  }

  return toFolderRecord(row);
};

/**
 * Spec section 10.2 `GET /children`: the folders and pages of every page collection inside one
 * folder, merged by order key (keyed rows first, the rest by `createdAt`), a page at a time by
 * cursor. Per page of rows: one read per source (two when the keyed rows run out), the parent
 * folder, one `findVersions` per collection with drafts, the child counts (one read of the
 * subfolders and one per page collection, only when the page holds folders), and the revision, so
 * 100 rows across two collections cost at most 12 database calls. Access is evaluated before any
 * row is read: a collection the user cannot read contributes nothing.
 */
export const getChildren = async (
  req: PayloadRequest,
  args: ChildrenArgs,
  options: ResolvedOptions = getResolvedOptions(req.payload)
): Promise<ChildrenResult> => {
  const limit = Math.min(
    Math.max(Math.trunc(args.limit ?? options.admin.pageSize), 1),
    maxTreePageSize
  );
  const cursor = args.cursor ? decodeCursor(args.cursor, options) : null;
  const view = resolveViewLocale(req, options, args.locale);
  const sources = await buildSources(req, options);
  const [folderSource] = sources;

  const parents = new Map<string, FolderRecord>();
  if (args.parent !== null) {
    const parentRecord = await readParent({ parent: args.parent, req, source: folderSource });
    parents.set(String(parentRecord.id), parentRecord);
  }

  const merged: Array<SiblingRow & TreeRow> = [];
  if (!cursor || cursor.phase === "keyed") {
    merged.push(
      ...(await readPhase({
        after: cursor,
        parent: args.parent,
        phase: "keyed",
        req,
        sources,
        want: limit + 1,
      }))
    );
  }
  // Fewer keyed rows than asked for means every source ran out of them.
  if (merged.length < limit + 1) {
    merged.push(
      ...(await readPhase({
        after: cursor,
        parent: args.parent,
        phase: "unkeyed",
        req,
        sources,
        want: limit + 1 - merged.length,
      }))
    );
  }

  const hasMore = merged.length > limit;
  const pageRows = merged.slice(0, limit);
  const last = pageRows.at(-1);
  const lastValue = last ? (last.orderKey ?? last.createdAt) : null;
  const nextCursor =
    hasMore && last && lastValue !== null
      ? encodeCursor({
          collection: last.collection,
          id: last.id,
          kind: last.kind,
          phase: last.orderKey === null ? "unkeyed" : "keyed",
          value: lastValue,
        })
      : null;

  const items = await buildTreeItems({
    options,
    parents,
    req,
    rows: pageRows.map(({ doc, source }) => ({ doc, source })),
    sources,
    view,
  });

  return { hasMore, items, nextCursor, revision: await readRevision(req) };
};
