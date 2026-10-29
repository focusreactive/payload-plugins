import type { PayloadRequest, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { getResolvedOptions } from "./runtime.js";
import type { FolderId, ResolvedOptions, TreeItem, TreeStatus } from "../types.js";
import type { FolderRecord } from "./folderRecords.js";
import { effectiveSegmentsOf } from "./pageRecords.js";
import {
  buildSources,
  buildTreeItems,
  pageSelect,
  readFolders,
  resolveViewLocale,
  sourceClauses,
  toFolderId,
} from "./treeItems.js";
import type { TreeRow, TreeSource, ViewLocale } from "./treeItems.js";
import { noLocaleKey } from "./locales.js";
import { folderPathIn } from "./uniqueness.js";

export const defaultSearchLimit = 50;
export const maxSearchLimit = 200;

/**
 * Candidates read per collection before the merge. Matches beyond it are not looked at, and the
 * answer says so with `truncated: true`.
 */
export const searchCandidateLimit = 500;

export type SearchArgs = {
  /** Candidates read per collection (default 500); a lower value is for tests. */
  candidateLimit?: number;
  /** The zoomed folder; `null` is the top level. */
  folder: FolderId | null;
  limit?: number;
  locale?: string | null;
  query: string;
  /** `folder` (default): the folder and its subfolders; `all`: the whole tree. */
  scope?: "all" | "folder";
  /**
   * Only pages with one of these statuses; folders have none and drop out. Where the status is
   * known from the main row it narrows the database query, so the candidate cap is spent on
   * pages that can match.
   */
  status?: TreeStatus[];
  /** Only these collections (page collections, or the folders' own slug). */
  types?: string[];
};

export type ParsedSearch = {
  /** Quoted text, matched as one exact phrase. */
  phrases: string[];
  /** Collections named by a type label in the query, such as `article`. */
  typeCollections: string[];
  /** Unquoted words, all of which must match. */
  words: string[];
};

/**
 * Spec section 7.2: words without quotes must all match, text in double quotes is one exact phrase,
 * and a word that equals a page type's label ("article", "blog post") limits the results to that
 * type instead of being searched for. The folders' own label limits the results to folders.
 */
export const parseSearchQuery = (
  query: string,
  labels: Array<{ collection: string; label: string }>
): ParsedSearch => {
  const phrases: string[] = [];
  let words: string[] = [];
  for (const match of query.matchAll(/"([^"]*)"|(\S+)/gu)) {
    if (match[1] === undefined) {
      const word = match[2].replaceAll('"', "").toLowerCase();
      if (word !== "") {
        words.push(word);
      }
    } else if (match[1].trim() !== "") {
      phrases.push(match[1].trim().toLowerCase());
    }
  }

  const typeCollections: string[] = [];
  for (const { collection, label } of labels) {
    const labelWords = label.toLowerCase().split(/\s+/u).filter(Boolean);
    const at = words.findIndex(
      (_, index) =>
        labelWords.length > 0 && labelWords.every((word, offset) => words[index + offset] === word)
    );
    if (at !== -1) {
      typeCollections.push(collection);
      words = [...words.slice(0, at), ...words.slice(at + labelWords.length)];
    }
  }

  return { phrases, typeCollections, words };
};

const isFieldLocalized = (req: PayloadRequest, collection: string, field: string): boolean =>
  (req.payload.collections[toCollectionSlug(collection)]?.config.flattenedFields ?? []).some(
    (entry) => entry.name === field && Boolean(entry.localized)
  );

/**
 * A text field contains `term` in the viewed locale, own value or, when the locale has none, the
 * default locale's (`<field>.<defaultLocale>` is the locale-qualified path decision 19 uses).
 */
const matchesText = ({
  field,
  isLocalized,
  term,
  view,
}: {
  field: string;
  isLocalized: boolean;
  term: string;
  view: ViewLocale;
}): Where => {
  const own: Where = { [field]: { contains: term } };
  if (!isLocalized || view.pageKey === view.defaultPageKey) {
    return own;
  }

  return {
    or: [
      own,
      {
        and: [
          { [field]: { exists: false } },
          { [`${field}.${view.defaultPageKey}`]: { contains: term } },
        ],
      },
    ],
  };
};

const termWhere = ({
  canMatchFolderPath,
  options,
  req,
  source,
  term,
  view,
}: {
  /** False when the user cannot read every folder: a path they cannot read must not match. */
  canMatchFolderPath: boolean;
  options: ResolvedOptions;
  req: PayloadRequest;
  source: TreeSource;
  term: string;
  view: ViewLocale;
}): Where => {
  if (source.kind === "folder") {
    const isLocalized = options.localizeSegments && view.folderKey !== noLocaleKey;

    return {
      or: ["name", "slug", "fullPath"].map((field) =>
        matchesText({ field, isLocalized, term, view })
      ),
    };
  }
  const page = source.page as NonNullable<TreeSource["page"]>;

  return {
    or: [
      matchesText({
        field: page.titleField,
        isLocalized: isFieldLocalized(req, page.slug, page.titleField),
        term,
        view,
      }),
      matchesText({ field: "pathSegment", isLocalized: page.segmentLocalized, term, view }),
      ...(canMatchFolderPath
        ? [
            matchesText({
              field: "folder.fullPath",
              isLocalized: options.localizeSegments && view.folderKey !== noLocaleKey,
              term,
              view,
            }),
          ]
        : []),
    ],
  };
};

/**
 * The part of a status filter the database can answer, or `false` when the collection cannot hold
 * a match at all. `changed` needs the latest version, and a locale that falls back to the default
 * one needs the fallback's status, so those are left to the check after the read (this result is
 * only ever a superset of the matches).
 */
const statusWhere = ({
  isDefaultLocaleView,
  source,
  statuses,
}: {
  isDefaultLocaleView: boolean;
  source: TreeSource;
  statuses: TreeStatus[] | undefined;
}): Where | false | null => {
  if (!statuses || statuses.length === 0) {
    return null;
  }
  if (source.kind === "folder") {
    return false;
  }
  if (!source.hasDrafts) {
    return statuses.includes("live") ? null : false;
  }
  const wantsDraft = statuses.includes("draft");
  const wantsMain = statuses.includes("published") || statuses.includes("changed");
  if (!(wantsDraft || wantsMain)) {
    return false;
  }
  if (!isDefaultLocaleView || (wantsDraft && wantsMain)) {
    return null;
  }

  return wantsMain
    ? { _status: { equals: "published" } }
    : { or: [{ _status: { equals: "draft" } }, { _status: { exists: false } }] };
};

const scopeWhere = (source: TreeSource, folder: FolderId): Where =>
  source.kind === "folder"
    ? { ancestorIds: { contains: `/${folder}/` } }
    : {
        or: [{ folder: { equals: folder } }, { "folder.ancestorIds": { contains: `/${folder}/` } }],
      };

const compareStrings = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
};

/** The path a result sorts by: a folder's own, or a page's composed from its folder's. */
const pathOf = (
  row: TreeRow,
  parents: Map<string, FolderRecord>,
  view: ViewLocale,
  options: ResolvedOptions,
  req: PayloadRequest
): string => {
  const { doc, source } = row;
  if (source.kind === "folder") {
    const fullPath = doc.fullPath as Record<string, unknown> | string | null | undefined;
    const byLocale = typeof fullPath === "string" ? { [noLocaleKey]: fullPath } : (fullPath ?? {});

    return String(byLocale[view.folderKey] || byLocale[view.defaultFolderKey] || "");
  }
  const parentId = toFolderId(doc.folder);
  // A page in a folder the user cannot read has no known path: it sorts first, with no invented URL.
  if (parentId !== null && !parents.has(String(parentId))) {
    return "";
  }
  const folderPath = folderPathIn(
    parentId === null ? null : (parents.get(String(parentId)) ?? null),
    view.folderKey,
    options,
    req.payload
  );
  const segment = effectiveSegmentsOf(
    { segments: doc.pathSegment },
    [view.pageKey],
    view.defaultPageKey
  )[view.pageKey];

  return doc.isFolderRoot ? folderPath || "/" : `${folderPath}/${segment}`;
};

const asText = (value: unknown, key: string, defaultKey: string): string => {
  if (value && typeof value === "object") {
    const byLocale = value as Record<string, unknown>;
    const text = byLocale[key] || byLocale[defaultKey];

    return typeof text === "string" ? text : "";
  }

  return typeof value === "string" ? value : "";
};

/** The exact check behind the database's `like`: every term is inside the title, segment or path. */
const matchesEveryTerm = (
  row: TreeRow & { path: string },
  terms: string[],
  parents: Map<string, FolderRecord>,
  view: ViewLocale,
  options: ResolvedOptions,
  req: PayloadRequest
): boolean => {
  const { doc, source } = row;
  let haystack: string[];
  if (source.kind === "folder") {
    haystack = [
      asText(doc.name, view.folderKey, view.defaultFolderKey),
      asText(doc.slug, view.folderKey, view.defaultFolderKey),
      row.path,
    ];
  } else {
    const parentId = toFolderId(doc.folder);
    haystack = [
      asText(
        doc[(source.page as NonNullable<TreeSource["page"]>).titleField],
        view.pageKey,
        view.defaultPageKey
      ),
      effectiveSegmentsOf({ segments: doc.pathSegment }, [view.pageKey], view.defaultPageKey)[
        view.pageKey
      ],
      folderPathIn(
        parentId === null ? null : (parents.get(String(parentId)) ?? null),
        view.folderKey,
        options,
        req.payload
      ),
    ];
  }
  const lowered = haystack.map((text) => text.toLowerCase());

  return terms.every((term) => lowered.some((text) => text.includes(term)));
};

/**
 * Spec section 10.2 `GET /search`: folders and pages whose name or title, segment or folder path
 * match every word and every quoted phrase, ordered by full path. Each collection is asked once for
 * its matching ids (the database does the matching, case-insensitively), then once for those rows,
 * so a title that falls back to the default locale is read whole. Scope is the zoomed folder's
 * subtree by `ancestorIds`, exact because ids are slash-delimited (decision 4). Read access is
 * applied to every query, so a collection the user cannot read finds nothing.
 *
 * A match is checked again in memory, because a `like` treats `%` and `_` in the query as
 * wildcards. Only the first 500 candidates of a collection are looked at; when a collection has
 * more, `truncated` is true and the list may be missing matches.
 */
export const searchTree = async (
  req: PayloadRequest,
  args: SearchArgs,
  options: ResolvedOptions = getResolvedOptions(req.payload)
): Promise<{ items: TreeItem[]; truncated: boolean }> => {
  const candidateLimit = Math.max(Math.trunc(args.candidateLimit ?? searchCandidateLimit), 1);
  const limit = Math.min(Math.max(Math.trunc(args.limit ?? defaultSearchLimit), 1), maxSearchLimit);
  const view = resolveViewLocale(req, options, args.locale);
  const allSources = await buildSources(req, options);
  const parsed = parseSearchQuery(
    args.query,
    allSources.map((source) => ({
      collection: source.collection,
      label:
        source.kind === "folder"
          ? options.folders.labels.singular
          : (source.page as NonNullable<TreeSource["page"]>).label,
    }))
  );
  const terms = [...parsed.words, ...parsed.phrases];
  const requestedTypes = [
    args.types,
    parsed.typeCollections.length > 0 ? parsed.typeCollections : undefined,
  ].filter((types): types is string[] => types !== undefined);
  const sources = allSources.filter(
    (source) =>
      source.scope.isAllowed && requestedTypes.every((types) => types.includes(source.collection))
  );
  if (terms.length === 0 && parsed.typeCollections.length === 0) {
    return { items: [], truncated: false };
  }

  const isScoped = (args.scope ?? "folder") === "folder" && args.folder !== null;
  const folderScope = allSources[0].scope;
  const canMatchFolderPath = folderScope.isAllowed && folderScope.where === null;
  const rows: TreeRow[] = [];
  let isTruncated = false;
  const isDefaultLocaleView = view.pageKey === view.defaultPageKey || view.pageKey === noLocaleKey;

  for (const source of sources) {
    const statusClause = statusWhere({ isDefaultLocaleView, source, statuses: args.status });
    if (statusClause === false) {
      continue;
    }
    const collection = toCollectionSlug(source.collection);
    const locale = source.kind === "folder" ? view.folderKey : view.pageKey;
    const matched = await req.payload.db.find({
      collection,
      // One more than the cap, to tell a full result from a cut one.
      limit: candidateLimit + 1,
      locale: locale === noLocaleKey ? undefined : locale,
      pagination: false,
      req,
      select: { id: true },
      sort:
        source.kind === "folder"
          ? ["fullPath", "id"]
          : [...(canMatchFolderPath ? ["folder.fullPath"] : []), "pathSegment", "id"],
      where: {
        and: [
          ...sourceClauses(req, source),
          ...(statusClause ? [statusClause] : []),
          ...(isScoped ? [scopeWhere(source, args.folder as FolderId)] : []),
          ...terms.map((term) =>
            termWhere({ canMatchFolderPath, options, req, source, term, view })
          ),
        ],
      },
    });
    if (matched.docs.length > candidateLimit) {
      isTruncated = true;
    }
    const ids = (matched.docs as Array<{ id: FolderId }>)
      .slice(0, candidateLimit)
      .map((doc) => doc.id);
    if (ids.length === 0) {
      continue;
    }
    const { docs } = await req.payload.db.find({
      collection,
      limit: 0,
      locale: "all",
      pagination: false,
      req,
      ...(source.kind === "page" ? { select: pageSelect(source) } : {}),
      where: { id: { in: ids } },
    });
    for (const doc of docs as Array<Record<string, unknown>>) {
      rows.push({ doc, source });
    }
  }
  if (rows.length === 0) {
    return { items: [], truncated: isTruncated };
  }

  // The folders the pages sit in give their paths; the folders found are their own.
  const folderSource = allSources[0];
  const parentIds = [
    ...new Set(
      rows
        .filter(({ source }) => source.kind === "page")
        .map(({ doc }) => toFolderId(doc.folder))
        .filter((id): id is FolderId => id !== null)
    ),
  ];
  const parents = await readFolders({ ids: parentIds, req, source: folderSource });

  const ordered = rows
    .map((row) => ({ ...row, path: pathOf(row, parents, view, options, req) }))
    .filter((row) => matchesEveryTerm(row, terms, parents, view, options, req))
    .sort(
      (left, right) =>
        compareStrings(left.path, right.path) ||
        compareStrings(left.source.kind, right.source.kind) ||
        compareStrings(left.source.collection, right.source.collection) ||
        compareStrings(String(left.doc.id), String(right.doc.id))
    );

  const wanted = args.status && args.status.length > 0 ? ordered : ordered.slice(0, limit);
  const items = await buildTreeItems({
    options,
    parents,
    req,
    rows: wanted.map(({ doc, source }) => ({ doc, source })),
    sources: allSources,
    view,
  });
  const allowedStatuses = args.status;

  return {
    items: (allowedStatuses && allowedStatuses.length > 0
      ? items.filter((item) => item.status !== undefined && allowedStatuses.includes(item.status))
      : items
    ).slice(0, limit),
    truncated: isTruncated,
  };
};
