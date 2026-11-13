import { APIError } from "payload";
import type { Payload, PayloadRequest, User, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ResolvedOptions } from "../types.js";
import { readAlternates } from "./alternates.js";
import { findRedirect } from "./findRedirect.js";
import { normalizeFolderReference, toFolderRecord } from "./folderRecords.js";
import { getFolderLocaleKeys, getLocaleCodes, noLocaleKey } from "./locales.js";
import { composeFullPath, formatPath, joinPath, normalizePath } from "./paths.js";
import { buildLiveInLocaleWhere } from "./publishedWhere.js";
import { isForbidden, resolveReadMode } from "./readMode.js";
import { getResolvedOptions } from "./runtime.js";
import { buildPageSegmentWhere, folderPathIn, getPageDefaultLocale } from "./uniqueness.js";
import { toText } from "./text.js";
import { badRequest } from "./badRequest.js";

export type ResolveArgs = {
  /** Default 1. */
  depth?: number;
  /** Read the latest drafts. Only a signed-in user (or `overrideAccess`) gets them; anyone else reads published pages. */
  draft?: boolean;
  /** Default: the default locale. Ignored when nothing is localized. */
  locale?: string | null;
  /** Default false: access control applies. */
  overrideAccess?: boolean;
  /** `/blog/post`, `/blog/post/`, `blog/post`, `/Blog/Post` and `/` are all accepted; a slash alone never redirects. */
  path: string;
  /** Default null: a public read. */
  user?: User | null;
};

export type ResolveResult<TDoc = Record<string, unknown>> =
  | {
      alternates: Record<string, string>;
      collection: string;
      doc: TDoc;
      fullPath: string;
      locale: string | null;
      type: "page";
    }
  | { status: 301; to: string; type: "redirect" }
  | { type: "notFound" };

type PageHit = { collection: string; createdAt: string; doc: Record<string, unknown> };

type LookupContext = {
  depth: number;
  draft: boolean;
  /** `null` when nothing is localized. */
  locale: string | null;
  options: ResolvedOptions;
  overrideAccess: boolean;
  payload: Payload;
  /** Runs the reads on this request, so they join its transaction. */
  req?: PayloadRequest;
  user: User | null;
};

/** The locale a request reads in: the one asked for, else the default; `null` when nothing is localized. */
export const resolveRequestLocale = (
  payload: Payload,
  locale: string | null | undefined
): string | null => {
  const codes = getLocaleCodes(payload.config);
  if (codes.length === 0) {
    return null;
  }
  if (locale === undefined || locale === null || locale === "") {
    return getPageDefaultLocale(payload);
  }
  if (!codes.includes(locale)) {
    throw badRequest(`"${locale}" is not a configured locale`);
  }

  return locale;
};

const decodePath = (path: string): string | null => {
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
};

const repeatedSlashes = /\/{2,}/gu;

/** Whether the visitor typed `//` anywhere: the URL has one canonical form without it. */
const hasRepeatedSlashes = (path: string): boolean => path.trim().includes("//");

/** The shape `normalizePath` gives, without lowercasing: one leading slash, no trailing one. */
const toPathShape = (path: string): string => {
  const collapsed = path.trim().replace(repeatedSlashes, "/");
  const withoutTrailingSlash = collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;

  return withoutTrailingSlash.startsWith("/") ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
};

/**
 * The pages at `path`, one lookup per page collection: a page whose folder's path is the parent
 * path and whose segment is the last one, or the root page of the folder at `path` (spec section
 * 10.1 step 3). Segments are matched with `buildSegmentWhere`, so a locale without its own segment
 * answers to the default locale's. Each collection runs its own read as the user, published rows
 * only unless drafts are wanted; a collection the user may not read at all answers nothing. When
 * two collections hold a hit, or one holds two, the oldest wins.
 *
 * `path` is matched as given, case included: a segment saved before the plugin may have capitals
 * (decision 22), and `resolvePath` tries the exact path before the lowercased one.
 */
const lookupPage = async (context: LookupContext, path: string): Promise<PageHit | null> => {
  const { depth, draft, locale, options, overrideAccess, payload, req, user } = context;
  const segments = path.split("/").filter((segment) => segment !== "");
  const lastSegment = segments.at(-1);
  const parentPath = `/${segments.slice(0, -1).join("/")}`;

  const hits = await Promise.all(
    Object.values(options.collections).map(async (page): Promise<PageHit | null> => {
      const pageClause: Where | null =
        lastSegment === undefined
          ? null
          : {
              and: [
                segments.length === 1
                  ? { folder: { exists: false } }
                  : { folderPath: { equals: parentPath } },
                buildPageSegmentWhere(payload, page, locale ?? noLocaleKey, lastSegment),
                { isFolderRoot: { not_equals: true } },
              ],
            };
      // A folder's path is always lowercase, so a root page can only match a lowercase path.
      const rootClause: Where | null =
        path === path.toLowerCase()
          ? {
              and: [
                lastSegment === undefined
                  ? { folder: { exists: false } }
                  : { folderPath: { equals: path } },
                { isFolderRoot: { equals: true } },
              ],
            }
          : null;
      const clauses = [pageClause, rootClause].filter((clause): clause is Where => clause !== null);
      if (clauses.length === 0) {
        return null;
      }
      const live = draft ? null : buildLiveInLocaleWhere(payload, page.slug, locale);

      try {
        const { docs } = await payload.find({
          collection: toCollectionSlug(page.slug),
          depth,
          draft,
          limit: 1,
          ...(locale === null ? {} : { locale: locale as never }),
          overrideAccess,
          pagination: false,
          ...(req ? { req } : {}),
          sort: ["createdAt", "id"],
          user,
          where: { and: [{ or: clauses }, ...(live ? [live] : [])] },
        });
        const [doc] = docs as unknown as Array<Record<string, unknown>>;

        return doc
          ? {
              collection: page.slug,
              createdAt: toText(doc.createdAt),
              doc,
            }
          : null;
      } catch (error) {
        // No read access to the whole collection is "nothing here", not an error.
        if (isForbidden(error)) {
          return null;
        }
        throw error;
      }
    })
  );

  let oldest: PageHit | null = null;
  for (const hit of hits) {
    if (hit && (oldest === null || hit.createdAt < oldest.createdAt)) {
      oldest = hit;
    }
  }

  return oldest;
};

/**
 * Whether a published page answers at exactly `path` (no locale prefix, capitals kept) in `locale`,
 * whoever asks: for plugin code that must know what is live, such as a queued redirect row that
 * should not start at a path a page has taken since. Pass `req` to read inside its transaction.
 */
export const hasLivePageAt = async (
  payload: Payload,
  { locale, path, req }: { locale: string | null; path: string; req?: PayloadRequest }
): Promise<boolean> =>
  (await lookupPage(
    {
      depth: 0,
      draft: false,
      locale: resolveRequestLocale(payload, locale),
      options: getResolvedOptions(payload),
      overrideAccess: true,
      payload,
      ...(req ? { req } : {}),
      user: null,
    },
    path
  )) !== null;

/** The lowercase path with its last segment replaced by `segment`, as the visitor typed it. */
const joinPathKeepingCase = (canonical: string, segment: string): string => {
  const segments = canonical.split("/").filter((part) => part !== "");

  return `/${[...segments.slice(0, -1), segment].join("/")}`;
};

/**
 * Spec section 10.1: the page, redirect or nothing that a URL path stands for.
 *
 * 1. The path is decoded and normalised (lowercase, one leading slash, no trailing one). A trailing
 *    slash or a missing leading one resolves in place, because the framework's `trailingSlash`
 *    redirect has already chosen the URL form and a slash redirect of the plugin's would loop
 *    against it (the host passes route params, which never carry the slash). A path that differs
 *    in case or has repeated slashes (`//blog//team`) is a `redirect` to the collapsed lowercase
 *    one, when a page lives there. A page saved with capitals before the plugin (decision 22)
 *    answers at its own exact path first, but only when the folder part is already lowercase:
 *    `/Blog/About` redirects to `/blog/About`, which answers in place. Every path the resolver
 *    answers (`fullPath`, `alternates`, `to`) is in the form set by `urls.trailingSlash`.
 * 2. `/` is the site root page.
 * 3. Published pages only unless `draft` is set by a signed-in user, with the user's access.
 * 4. Nothing found runs `findRedirect`, and a redirect is answered only when something live is at
 *    its target for this same reader; the redirect row's target is never returned.
 */
export const resolvePath = async <TDoc = Record<string, unknown>>(
  payload: Payload,
  args: ResolveArgs
): Promise<ResolveResult<TDoc>> => {
  const options = getResolvedOptions(payload);
  const locale = resolveRequestLocale(payload, args.locale);
  const { draft, overrideAccess, user } = resolveReadMode(args);
  const context: LookupContext = {
    depth: Math.min(Math.max(Math.trunc(args.depth ?? 1), 0), 10),
    draft,
    locale,
    options,
    overrideAccess,
    payload,
    user,
  };

  const decoded = decodePath(args.path);
  if (decoded === null) {
    return { type: "notFound" };
  }
  const canonical = normalizePath(decoded);
  const form = (path: string): string => formatPath(path, options.urls.trailingSlash);
  const exactShape = toPathShape(decoded);
  const isCaseDifferent = exactShape !== canonical;

  const toPageResult = async (hit: PageHit, matchedPath: string): Promise<ResolveResult<TDoc>> => {
    const fullPath = form(typeof hit.doc.fullPath === "string" ? hit.doc.fullPath : matchedPath);

    return {
      alternates: await readAlternates({
        collection: hit.collection,
        draft: context.draft,
        id: hit.doc.id as FolderId,
        payload,
      }),
      collection: hit.collection,
      doc: hit.doc as TDoc,
      fullPath,
      locale,
      type: "page",
    };
  };

  const hasSlashRepeats = hasRepeatedSlashes(decoded);
  // Only the last segment can keep its capitals: a folder's path is always lowercase.
  const lastExactSegment = exactShape.split("/").at(-1) ?? "";
  if (isCaseDifferent && lastExactSegment !== lastExactSegment.toLowerCase()) {
    const legacyPath = joinPathKeepingCase(canonical, lastExactSegment);
    const legacyHit = await lookupPage(context, legacyPath);
    if (legacyHit) {
      const exactFolderPart = exactShape.slice(0, exactShape.lastIndexOf("/"));
      const isFolderPartExact = exactFolderPart === exactFolderPart.toLowerCase();

      return hasSlashRepeats || !isFolderPartExact
        ? { status: 301, to: form(legacyPath), type: "redirect" }
        : toPageResult(legacyHit, legacyPath);
    }
  }

  const hit = await lookupPage(context, canonical);
  if (hit) {
    return isCaseDifferent || hasSlashRepeats
      ? { status: 301, to: form(canonical), type: "redirect" }
      : toPageResult(hit, canonical);
  }

  const redirect = await findRedirect(payload, {
    isLive: async (path) => (await lookupPage(context, path)) !== null,
    locale: locale ?? undefined,
    path: canonical,
  });

  // `target` stays inside: it names a document the reader may not be allowed to know about.
  return redirect ? { status: 301, to: redirect.to, type: "redirect" } : { type: "notFound" };
};

/**
 * What the full path of a page would be with the folder and slug of a form that is not saved yet
 * (spec section 10.1): for `generateURL`, `admin.livePreview.url` and `admin.preview`, which get
 * form data and would otherwise show the path of the last save. The folder is read as it is now,
 * past access control, with the default-locale fallback a folder path gets in `locale`. A root page
 * takes its folder's path, and a page without a slug yet takes its folder's path too, so a preview
 * of a new page points at the folder.
 *
 * Throws an `APIError` with status 404 when `folder` names a folder that does not exist (a form
 * pointing at a folder deleted since it was opened). A caller in `admin.preview` or
 * `admin.livePreview.url`, where a throw breaks the whole preview button, should catch it and fall
 * back to no preview URL.
 */
export const computeFullPath = async (
  payload: Payload,
  args: {
    folder: FolderId | { id: FolderId } | null | undefined;
    isFolderRoot: boolean;
    locale?: string | null;
    slug: string;
  }
): Promise<string> => {
  const options = getResolvedOptions(payload);
  const locale = resolveRequestLocale(payload, args.locale);
  const folderKey =
    locale !== null && getFolderLocaleKeys(payload, options).includes(locale)
      ? locale
      : noLocaleKey;
  const { id: folderId } = normalizeFolderReference(args.folder);

  let folderPath = "";
  if (folderId !== null) {
    const row = (await payload.db.findOne({
      collection: toCollectionSlug(options.folders.slug),
      locale: "all",
      where: { id: { equals: folderId } },
    })) as Record<string, unknown> | null;
    if (!row) {
      throw new APIError(`The folder ${String(folderId)} does not exist`, 404, null, true);
    }
    folderPath = folderPathIn(toFolderRecord(row), folderKey, options, payload);
  }

  const composed = composeFullPath({
    folderPath,
    isFolderRoot: args.isFolderRoot,
    segment: args.slug.trim(),
  });

  return formatPath(
    composed ?? joinPath(folderPath === "" ? "/" : folderPath),
    options.urls.trailingSlash
  );
};
