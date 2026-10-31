import type { Payload, SelectType, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId } from "../types.js";
import { livePathsByLocale } from "./alternates.js";
import { getLocaleCodes } from "./locales.js";
import { normalizePath } from "./paths.js";
import {
  buildLiveAnywhereWhere,
  buildLiveInLocaleWhere,
  collectionHasDrafts,
} from "./publishedWhere.js";
import { isForbidden, resolveReadMode } from "./readMode.js";
import type { ReadModeArgs } from "./readMode.js";
import { resolveRequestLocale } from "./resolve.js";
import { getResolvedOptions } from "./runtime.js";

export type PathRow = {
  collection: string;
  fullPath: string;
  id: FolderId;
  /** `null` when nothing is localized. */
  locale: string | null;
  updatedAt: string;
};

export type PathsArgs = ReadModeArgs & {
  /** One locale, or `all` for a row per page and locale. Default: the default locale. */
  locale?: string | "all" | null;
  /** `/blog`: that folder's root page and every page beneath it. Read in the default locale for `all`. */
  rootPages?: "exclude" | "include" | "only";
  under?: string;
};

/** The most rows one endpoint request returns; a request may ask for fewer. */
export const maxPathsPerRequest = 10_000;

const toText = (value: unknown): string => (typeof value === "string" ? value : "");

const idOf = (value: unknown): FolderId | null => {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "id" in value) {
    return idOf((value as { id: unknown }).id);
  }

  return null;
};

/** The folder at `path` in `locale`, the reader permitting; `null` when there is none. */
const findFolderAt = async ({
  locale,
  mode,
  path,
  payload,
}: {
  locale: string | null;
  mode: ReturnType<typeof resolveReadMode>;
  path: string;
  payload: Payload;
}): Promise<FolderId | null> => {
  const options = getResolvedOptions(payload);
  try {
    const { docs } = await payload.find({
      collection: toCollectionSlug(options.folders.slug),
      depth: 0,
      limit: 1,
      ...(locale === null || !options.localizeSegments ? {} : { locale: locale as never }),
      overrideAccess: mode.overrideAccess,
      pagination: false,
      select: { id: true } as SelectType,
      sort: "id",
      user: mode.user,
      where: { fullPath: { equals: path } },
    });

    return idOf((docs[0] as { id?: unknown } | undefined)?.id);
  } catch (error) {
    if (isForbidden(error)) {
      return null;
    }
    throw error;
  }
};

/**
 * Spec section 10.1 `getAllPaths`: one row for each page the reader can see, in each locale it is
 * live in (published only unless a signed-in reader asks for `draft`), for sitemaps and static
 * generation. Rows are ordered by path, then locale, collection and id, so a page of them is stable
 * from one request to the next.
 */
export const getAllPaths = async (payload: Payload, args: PathsArgs = {}): Promise<PathRow[]> => {
  const options = getResolvedOptions(payload);
  const mode = resolveReadMode(args);
  const codes = getLocaleCodes(payload.config);
  const isAllLocales = args.locale === "all" && codes.length > 0;
  const singleLocale = isAllLocales ? null : resolveRequestLocale(payload, args.locale);
  const rowLocales: Array<string | null> = isAllLocales ? codes : [singleLocale];
  const rootPages = args.rootPages ?? "include";

  let inside: Where | null = null;
  const under = args.under === undefined ? "/" : normalizePath(args.under);
  if (under !== "/") {
    const folderId = await findFolderAt({
      locale: isAllLocales ? resolveRequestLocale(payload, null) : singleLocale,
      mode,
      path: under,
      payload,
    });
    if (folderId === null) {
      return [];
    }
    inside = {
      or: [
        { folder: { equals: folderId } },
        { "folder.ancestorIds": { contains: `/${String(folderId)}/` } },
      ],
    };
  }

  const rows: PathRow[] = [];
  for (const page of Object.values(options.collections)) {
    const hasDrafts = collectionHasDrafts(payload, page.slug);
    let live: Where | null = null;
    if (!mode.draft) {
      live = isAllLocales
        ? buildLiveAnywhereWhere(payload, page.slug)
        : buildLiveInLocaleWhere(payload, page.slug, singleLocale);
    }
    const rootClause: Where | null =
      rootPages === "only"
        ? { isFolderRoot: { equals: true } }
        : rootPages === "exclude"
          ? { isFolderRoot: { not_equals: true } }
          : null;
    const clauses = [inside, live, rootClause].filter((clause): clause is Where => clause !== null);

    try {
      const { docs } = await payload.find({
        collection: toCollectionSlug(page.slug),
        depth: 0,
        draft: mode.draft,
        locale: codes.length > 0 ? ("all" as never) : undefined,
        overrideAccess: mode.overrideAccess,
        pagination: false,
        select: {
          ...(hasDrafts ? { _status: true } : {}),
          fullPath: true,
          updatedAt: true,
        } as SelectType,
        user: mode.user,
        ...(clauses.length > 0 ? { where: { and: clauses } } : {}),
      });
      for (const doc of docs as unknown as Array<Record<string, unknown>>) {
        const livePaths =
          codes.length > 0
            ? livePathsByLocale({
                draft: mode.draft,
                fullPath: doc.fullPath,
                hasDrafts,
                payload,
                status: doc._status,
              })
            : {};
        for (const locale of rowLocales) {
          const fullPath = locale === null ? toText(doc.fullPath) : (livePaths[locale] ?? "");
          if (fullPath !== "") {
            rows.push({
              collection: page.slug,
              fullPath,
              id: doc.id as FolderId,
              locale,
              updatedAt: toText(doc.updatedAt),
            });
          }
        }
      }
    } catch (error) {
      if (!isForbidden(error)) {
        throw error;
      }
    }
  }

  return rows.toSorted(
    (left, right) =>
      left.fullPath.localeCompare(right.fullPath, "en") ||
      (left.locale ?? "").localeCompare(right.locale ?? "", "en") ||
      left.collection.localeCompare(right.collection, "en") ||
      String(left.id).localeCompare(String(right.id), "en", { numeric: true })
  );
};
