import type { Payload, PayloadRequest, SelectType, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../types.js";
import type { FolderRecord } from "./folderRecords.js";
import { getDefaultLocaleKey, getLocaleCodes, noLocaleKey } from "./locales.js";
import { buildSegmentWhere } from "./segmentWhere.js";

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

export type SegmentConflict =
  | { kind: "folder"; path: string }
  | { kind: "page"; path: string; title: string };

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
};

/**
 * Where that matches pages published in at least one locale. `_status` is localized when a
 * collection has drafts and localized fields (`localizeStatus`), and a page is live as soon as one
 * locale is published. Null for a collection without drafts, where every row is live.
 */
const buildPublishedWhere = (payload: Payload, collectionSlug: string): Where | null => {
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

const toText = (value: unknown): string => (typeof value === "string" ? value : "");

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
      "Untitled"
    );
  }

  return toText(value) || "Untitled";
};

const buildPageSegmentWhere = (
  req: PayloadRequest,
  page: ResolvedPageCollection,
  locale: string,
  segment: string
): Where =>
  page.segmentLocalized && locale !== noLocaleKey
    ? buildSegmentWhere({
        defaultLocale: getPageDefaultLocale(req.payload),
        locale,
        segment,
      })
    : { pathSegment: { equals: segment } };

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
    where: { fullPath: { equals: path } },
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
          buildPageSegmentWhere(req, page, locale, segment),
          ...(self?.collection === page.slug ? [{ id: { not_equals: self.id } }] : []),
          ...(publishedWhere ? [publishedWhere] : []),
        ],
      },
    });
    const [other] = clash.docs as Array<{ id: FolderId }>;
    if (other) {
      return { kind: "page", path, title: await readTitle(req, page, other.id, locale) };
    }
  }

  return null;
};

export const describeSegmentConflict = (conflict: SegmentConflict): string =>
  conflict.kind === "folder"
    ? `${conflict.path} is already used by a folder`
    : `${conflict.path} is already used by ${conflict.title} (published)`;

export const describeRootPageConflict = (conflict: RootPageConflict, folderPath: string): string =>
  `${conflict.title} is already the root page of ${folderPath}. Unset it first.`;

export const describeMissingSegment = (defaultLocale: string): string =>
  defaultLocale === noLocaleKey
    ? "A page needs a slug"
    : `A page needs a slug in the default locale (${defaultLocale}); save it in ${defaultLocale} first`;

export type RootPageConflict = { title: string };

/** Rule 3 of spec section 2.6: another page already marked as the root page of the folder. */
export const findRootPageConflict = async ({
  folder,
  options,
  req,
  self,
}: {
  folder: FolderRecord | null;
  options: ResolvedOptions;
  req: PayloadRequest;
  self: PageRef | null;
}): Promise<RootPageConflict | null> => {
  const { payload } = req;

  for (const page of Object.values(options.collections)) {
    const publishedWhere = buildPublishedWhere(payload, page.slug);
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
    const [other] = clash.docs as Array<{ id: FolderId }>;
    if (other) {
      return { title: await readTitle(req, page, other.id, getPageDefaultLocale(payload)) };
    }
  }

  return null;
};

/** Spec section 2.7 for a page: its folder's depth, plus one unless it is the folder's root page. */
export const pageDepthIn = (folder: FolderRecord | null, isFolderRoot: boolean): number =>
  (folder?.depth ?? 0) + (isFolderRoot ? 0 : 1);
