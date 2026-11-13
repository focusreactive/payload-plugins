import type { Payload, PayloadRequest, SelectType, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../types.js";
import type { FolderRecord } from "./folderRecords.js";
import { canReadItem } from "./access.js";
import { getDefaultLocaleKey, getLocaleCodes, noLocaleKey } from "./locales.js";
import { effectiveSegmentsOf } from "./pageRecords.js";
import { buildSegmentWhere } from "./segmentWhere.js";
import { toText } from "./text.js";
import { itemKey } from "./itemKey.js";
import { untitledTitle } from "./untitled.js";

/** The locale slots a page's paths are checked in: every locale code, or one slot without localization. */
export const getPageLocaleKeys = (payload: Payload): string[] => {
  const codes = getLocaleCodes(payload.config);

  return codes.length > 0 ? codes : [noLocaleKey];
};

export const getPageDefaultLocale = (payload: Payload): string =>
  payload.config.localization ? payload.config.localization.defaultLocale : noLocaleKey;

/** The locale argument for a database query in slot `key`; none when nothing is localized. */
export const queryLocaleOf = (key: string): string | undefined =>
  key === noLocaleKey ? undefined : key;

/** A folder's path in slot `key`; folders are read with no fallback, so the default locale fills a gap. */
export const folderPathIn = (
  folder: FolderRecord | null,
  key: string,
  options: ResolvedOptions,
  payload: Payload
): string =>
  folder
    ? folder.fullPath[key] ||
      folder.fullPath[getDefaultLocaleKey(payload, options)] ||
      folder.fullPath[noLocaleKey] ||
      ""
    : "";

export type PageRef = { collection: string; id: FolderId };

export type PageSegmentConflict = {
  /** The collection and id let a caller decide whether the reader may be told the title. */
  collection: string;
  id: FolderId;
  kind: "page";
  path: string;
  title: string;
};

export type SegmentConflict = { kind: "folder"; path: string } | PageSegmentConflict;

type SegmentConflictArgs = {
  /** The folder the page sits in; `null` is the site root level. */
  folder: FolderRecord | null;
  locale: string;
  options: ResolvedOptions;
  /** Only pages published in some locale count; a draft is not at that URL yet. */
  publishedOnly: boolean;
  req: PayloadRequest;
  segment: string;
  /** The page being saved, which never conflicts with itself. */
  self: PageRef | null;
  /** The folder being renamed, whose own path is not a clash with itself. */
  selfFolder?: FolderId;
};

/**
 * Where that matches pages published in at least one locale. `_status` is localized when a
 * collection has drafts and localized fields (`localizeStatus`), and a page is live as soon as one
 * locale is published. Null for a collection without drafts, where every row is live.
 */
export const buildPublishedWhere = (payload: Payload, collectionSlug: string): Where | null => {
  const config = payload.collections[toCollectionSlug(collectionSlug)]?.config;
  if (!config?.versions?.drafts) {
    return null;
  }
  const isStatusLocalized =
    Boolean(payload.config.localization) &&
    config.flattenedFields.some((field) => field.name === "_status" && field.localized);

  return isStatusLocalized
    ? {
        or: getLocaleCodes(payload.config).map((code) => ({
          [`_status.${code}`]: { equals: "published" },
        })),
      }
    : { _status: { equals: "published" } };
};

export const readTitle = async (
  req: PayloadRequest,
  page: ResolvedPageCollection,
  id: FolderId,
  locale: string
): Promise<string> => {
  const row = (await req.payload.db.findOne({
    collection: toCollectionSlug(page.slug),
    locale: "all",
    req,
    select: { [page.titleField]: true } as SelectType,
    where: { id: { equals: id } },
  })) as Record<string, unknown> | null;
  const value = row?.[page.titleField];
  if (value && typeof value === "object") {
    const byLocale = value as Record<string, unknown>;

    return (
      toText(byLocale[locale]) ||
      toText(byLocale[getPageDefaultLocale(req.payload)]) ||
      Object.values(byLocale).map(toText).find(Boolean) ||
      untitledTitle
    );
  }

  return toText(value) || untitledTitle;
};

export const buildPageSegmentWhere = (
  payload: Payload,
  page: ResolvedPageCollection,
  locale: string,
  segment: string | string[]
): Where =>
  page.segmentLocalized && locale !== noLocaleKey
    ? buildSegmentWhere({
        defaultLocale: getPageDefaultLocale(payload),
        locale,
        segment,
      })
    : { pathSegment: Array.isArray(segment) ? { in: segment } : { equals: segment } };

/**
 * Rules 1 and 2 of spec section 2.6 for one folder and locale: another non-root page in the folder
 * (any opted-in collection) with the same effective segment, or a subfolder of the folder with
 * that segment. Pages are matched with `buildSegmentWhere`, so a page without a segment of its own
 * in `locale` counts with the default locale's (build-lead decision 19). Returns the first
 * conflict, or null.
 */
export const findSegmentConflict = async ({
  folder,
  locale,
  options,
  publishedOnly,
  req,
  segment,
  self,
  selfFolder,
}: SegmentConflictArgs): Promise<SegmentConflict | null> => {
  const { payload } = req;
  const path = `${folderPathIn(folder, locale, options, payload)}/${segment}`;

  const folderClash = await payload.db.find({
    collection: toCollectionSlug(options.folders.slug),
    limit: 1,
    locale: queryLocaleOf(locale),
    pagination: false,
    req,
    select: { id: true },
    where: {
      and: [
        { fullPath: { equals: path } },
        ...(selfFolder === undefined ? [] : [{ id: { not_equals: selfFolder } }]),
      ],
    },
  });
  if (folderClash.docs.length > 0) {
    return { kind: "folder", path };
  }

  for (const page of Object.values(options.collections)) {
    const publishedWhere = publishedOnly ? buildPublishedWhere(payload, page.slug) : null;
    const clash = await payload.db.find({
      collection: toCollectionSlug(page.slug),
      limit: 1,
      locale: queryLocaleOf(locale),
      pagination: false,
      req,
      select: { id: true },
      where: {
        and: [
          { folder: { equals: folder?.id ?? null } },
          { isFolderRoot: { not_equals: true } },
          buildPageSegmentWhere(payload, page, locale, segment),
          ...(self?.collection === page.slug ? [{ id: { not_equals: self.id } }] : []),
          ...(publishedWhere ? [publishedWhere] : []),
        ],
      },
    });
    const [other] = clash.docs as Array<{ id: FolderId }>;
    if (other) {
      return {
        collection: page.slug,
        id: other.id,
        kind: "page",
        path,
        title: await readTitle(req, page, other.id, locale),
      };
    }
  }

  return null;
};

/**
 * `findSegmentConflict` for many segments of one folder and locale at once, for a bulk move: one
 * query for folders (`fullPath in [...]`) and, per page collection, one query for the matching
 * pages plus one more to read the matched pages' segments, instead of a handful of queries per
 * segment. Returns the first conflict per segment, folders before pages, in collection order, the
 * same answer and message data as the single check. The moved pages are never in `folder`, so
 * none is excluded.
 */
export const findSegmentConflicts = async ({
  folder,
  locale,
  options,
  publishedOnly,
  req,
  segments,
}: {
  folder: FolderRecord | null;
  locale: string;
  options: ResolvedOptions;
  publishedOnly: boolean;
  req: PayloadRequest;
  segments: string[];
}): Promise<Map<string, SegmentConflict>> => {
  const { payload } = req;
  const conflicts = new Map<string, SegmentConflict>();
  const wanted = [...new Set(segments)];
  if (wanted.length === 0) {
    return conflicts;
  }
  const folderPath = folderPathIn(folder, locale, options, payload);
  const pathOf = (segment: string): string => `${folderPath}/${segment}`;

  const folderClashes = await payload.db.find({
    collection: toCollectionSlug(options.folders.slug),
    locale: queryLocaleOf(locale),
    pagination: false,
    req,
    select: { fullPath: true },
    where: { fullPath: { in: wanted.map(pathOf) } },
  });
  // The adapter returns every locale of a localized column, so the locale asked about is picked.
  const clashingPaths = new Set(
    (folderClashes.docs as Array<{ fullPath?: unknown }>).map((doc) =>
      doc.fullPath && typeof doc.fullPath === "object"
        ? (doc.fullPath as Record<string, unknown>)[locale]
        : doc.fullPath
    )
  );
  for (const segment of wanted) {
    if (clashingPaths.has(pathOf(segment))) {
      conflicts.set(segment, { kind: "folder", path: pathOf(segment) });
    }
  }

  const pageDefaultLocale = getPageDefaultLocale(payload);
  for (const page of Object.values(options.collections)) {
    const open = wanted.filter((segment) => !conflicts.has(segment));
    if (open.length === 0) {
      break;
    }
    const publishedWhere = publishedOnly ? buildPublishedWhere(payload, page.slug) : null;
    const matched = await payload.db.find({
      collection: toCollectionSlug(page.slug),
      locale: queryLocaleOf(locale),
      pagination: false,
      req,
      select: { id: true },
      where: {
        and: [
          { folder: { equals: folder?.id ?? null } },
          { isFolderRoot: { not_equals: true } },
          buildPageSegmentWhere(payload, page, locale, open),
          ...(publishedWhere ? [publishedWhere] : []),
        ],
      },
    });
    const matchedIds = (matched.docs as Array<{ id: FolderId }>).map((doc) => doc.id);
    if (matchedIds.length === 0) {
      continue;
    }
    // The match used the request locale's value or the default locale's; the effective segment of
    // each hit says which of the wanted segments it holds.
    const hits = await payload.db.find({
      collection: toCollectionSlug(page.slug),
      locale: "all",
      pagination: false,
      req,
      select: { pathSegment: true },
      where: { id: { in: matchedIds } },
    });
    for (const hit of hits.docs as Array<{ id: FolderId; pathSegment?: unknown }>) {
      const effective = effectiveSegmentsOf(
        { segments: hit.pathSegment },
        [locale],
        pageDefaultLocale
      )[locale];
      if (!open.includes(effective) || conflicts.has(effective)) {
        continue;
      }
      conflicts.set(effective, {
        collection: page.slug,
        id: hit.id,
        kind: "page",
        path: pathOf(effective),
        title: await readTitle(req, page, hit.id, locale),
      });
    }
  }

  return conflicts;
};

/** What a message calls a page the reader may not read, so it names nothing about it. */
export const hiddenPageName = "a page";

/**
 * Names the page that holds a conflicting path for the user of `req`: its title when the user may
 * read it, "a page" when not. A title is read at database level, which checks no access, and a
 * check or a preview runs over drafts and over pages the caller may have no read access to. The
 * answer is kept per page, so the `read` access runs once for each conflicting page.
 */
export const createConflictNamer = (
  req: PayloadRequest
): ((conflict: PageSegmentConflict) => Promise<string>) => {
  const readable = new Map<string, boolean>();

  return async (conflict) => {
    const key = itemKey(conflict);
    let isReadable = readable.get(key);
    if (isReadable === undefined) {
      isReadable = await canReadItem({
        item: { collection: conflict.collection, id: conflict.id },
        req,
      });
      readable.set(key, isReadable);
    }

    return isReadable ? conflict.title : hiddenPageName;
  };
};

export const describeSegmentConflict = (conflict: SegmentConflict): string =>
  conflict.kind === "folder"
    ? `${conflict.path} is already used by a folder`
    : `${conflict.path} is already used by ${conflict.title} (published)`;

export const describeRootPageConflict = (conflict: RootPageConflict, folderPath: string): string =>
  `${conflict.title} is already the root page of ${folderPath}. Unset it first.`;

/** The same refusal for a reader who may not see the other page, so it names nothing about it. */
export const describeHiddenRootPageConflict = (folderPath: string): string =>
  `Another page is already the root page of ${folderPath}. Unset it first.`;

/**
 * The refusal messages of a page save. The page that holds the path or the root place is named
 * only when the caller may read it (decision 37), else it is "a page" and the root page message
 * names nothing; a system call (`overrideAccess`) names it as it is. The segment holder's answer
 * is kept per page, so the `read` access runs once for each one.
 */
export const createSaveConflictDescriber = ({
  overrideAccess,
  req,
}: {
  overrideAccess: boolean;
  req: PayloadRequest;
}): {
  rootPage: (conflict: RootPageConflict, folderPath: string) => Promise<string>;
  segment: (conflict: SegmentConflict) => Promise<string>;
} => {
  const nameConflictingPage = createConflictNamer(req);

  return {
    rootPage: async (conflict, folderPath) =>
      overrideAccess ||
      (await canReadItem({ item: { collection: conflict.collection, id: conflict.id }, req }))
        ? describeRootPageConflict(conflict, folderPath)
        : describeHiddenRootPageConflict(folderPath),
    segment: async (conflict) =>
      conflict.kind === "folder" || overrideAccess
        ? describeSegmentConflict(conflict)
        : describeSegmentConflict({ ...conflict, title: await nameConflictingPage(conflict) }),
  };
};

/**
 * The refusal for a live locale with no segment: its own, or the default locale's live one through
 * fallback. `locale` is the live locale that has none.
 */
export const describeMissingSegment = (locale: string, defaultLocale: string): string => {
  if (defaultLocale === noLocaleKey) {
    return "A page needs a slug";
  }
  if (locale === defaultLocale) {
    return `A page needs a slug in the default locale (${defaultLocale}); save it in ${defaultLocale} first`;
  }

  return `A page published in ${locale} needs a ${locale} slug, or a published ${defaultLocale} slug to fall back to: give it a ${locale} slug or publish it in ${defaultLocale} first`;
};

/**
 * The first live locale whose effective segment is empty, the default locale first; `null` when
 * every live locale has one. A locale is live when it is published itself or is served the default
 * locale's published page through fallback (decision 24), so a page live only in `de` with its own
 * `de` segment is valid and needs no `en` segment.
 */
export const findLocaleWithoutSegment = ({
  defaultLocale,
  effective,
  liveKeys,
}: {
  defaultLocale: string;
  effective: Record<string, string>;
  liveKeys: string[];
}): string | null => {
  const missing = liveKeys.filter((key) => (effective[key] ?? "") === "");

  return missing.includes(defaultLocale) ? defaultLocale : (missing[0] ?? null);
};

/** The page that holds the place: `collection` and `id` let a caller decide whether to name it. */
export type RootPageConflict = { collection: string; id: FolderId; title: string };

/**
 * Rule 3 of spec section 2.6: another page already marked as the root page of the folder.
 *
 * `published` counts main rows of pages that are live, the rule a publish binds to. `latest` is the
 * draft warning of the edit view (decision 10): any main row marked as root, and, in a collection
 * with drafts, any page whose latest version is marked, so a root that exists only as an unpublished
 * draft counts too.
 */
export const findRootPageConflict = async ({
  folder,
  options,
  req,
  scope = "published",
  self,
}: {
  folder: FolderRecord | null;
  options: ResolvedOptions;
  req: PayloadRequest;
  scope?: "latest" | "published";
  self: PageRef | null;
}): Promise<RootPageConflict | null> => {
  const { payload } = req;

  for (const page of Object.values(options.collections)) {
    const publishedWhere = scope === "published" ? buildPublishedWhere(payload, page.slug) : null;
    const clash = await payload.db.find({
      collection: toCollectionSlug(page.slug),
      limit: 1,
      pagination: false,
      req,
      select: { id: true },
      where: {
        and: [
          { folder: { equals: folder?.id ?? null } },
          { isFolderRoot: { equals: true } },
          ...(self?.collection === page.slug ? [{ id: { not_equals: self.id } }] : []),
          ...(publishedWhere ? [publishedWhere] : []),
        ],
      },
    });
    let other = (clash.docs as Array<{ id: FolderId }>)[0]?.id;
    if (
      other === undefined &&
      scope === "latest" &&
      payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
    ) {
      const versions = await payload.db.findVersions({
        collection: toCollectionSlug(page.slug),
        limit: 1,
        pagination: false,
        req,
        where: {
          and: [
            { latest: { equals: true } },
            { "version.folder": { equals: folder?.id ?? null } },
            { "version.isFolderRoot": { equals: true } },
            ...(self?.collection === page.slug ? [{ parent: { not_equals: self.id } }] : []),
          ],
        },
      });
      other = (versions.docs as Array<{ parent: FolderId }>)[0]?.parent;
    }
    if (other !== undefined) {
      return {
        collection: page.slug,
        id: other,
        title: await readTitle(req, page, other, getPageDefaultLocale(payload)),
      };
    }
  }

  return null;
};

/** Spec section 2.7 for a page: its folder's depth, plus one unless it is the folder's root page. */
export const pageDepthIn = (folder: FolderRecord | null, isFolderRoot: boolean): number =>
  (folder?.depth ?? 0) + (isFolderRoot ? 0 : 1);
