import type { Payload } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderRedirectsSlug } from "../constants.js";
import type { FolderId, ItemRef } from "../types.js";
import { noLocaleKey } from "./locales.js";
import { joinPath, normalizePath, prefixesOf } from "./paths.js";
import { lookupKeyOf } from "./redirects.js";
import { getResolvedOptions } from "./runtime.js";

/** Redirect hops followed at most, so a loop of rows ends instead of spinning. */
export const maxRedirectHops = 3;

export type FindRedirectArgs = {
  /**
   * Whether a page or folder lives at `path` in `locale`. Spec section 5.6: the candidate is
   * resolved, and when nothing lives there the lookup repeats on it, at most 3 hops. Without it the
   * first candidate is returned as it is, which keeps the common case at two queries; the resolver
   * (P-31) passes its own stock lookup here.
   */
  isLive?: (path: string) => boolean | Promise<boolean>;
  /** The locale the path was requested in. Omit it when localization is off, or for the default locale. */
  locale?: string | null;
  /** The path that resolved to nothing, without a locale prefix. */
  path: string;
};

export type FoundRedirect = {
  /** Redirect rows followed to get here: 1 in the common case, at most 3. */
  hops: number;
  /** The document or folder the row names. */
  target: ItemRef;
  status: 301;
  /** The current path of the target, with the remainder of a prefix row appended. Never locale prefixed. */
  to: string;
};

type RedirectRowDoc = {
  fromPath: string;
  kind: "folderPrefix" | "page";
  lookupKey: string;
  target?: { relationTo: string; value: FolderId | { id: FolderId } } | null;
};

const targetIdOf = (value: NonNullable<RedirectRowDoc["target"]>["value"]): FolderId =>
  typeof value === "object" ? value.id : value;

/** The target's current path in `locale`, or null when it is gone, not published or has no path. */
const readCurrentPath = async ({
  locale,
  payload,
  target,
}: {
  locale: string | null;
  payload: Payload;
  target: ItemRef;
}): Promise<string | null> => {
  const collection = toCollectionSlug(target.collection);
  const hasDrafts = Boolean(payload.collections[collection]?.config.versions?.drafts);
  const doc = (await payload.findByID({
    collection,
    depth: 0,
    disableErrors: true,
    draft: false,
    id: target.id,
    ...(locale === null ? {} : { locale: locale as never }),
    overrideAccess: true,
    select: { ...(hasDrafts ? { _status: true } : {}), fullPath: true } as never,
  })) as { _status?: unknown; fullPath?: unknown } | null;

  // Only a page can be unpublished; a folder is always there.
  if (!doc || (hasDrafts && doc._status !== "published")) {
    return null;
  }

  return typeof doc.fullPath === "string" && doc.fullPath !== "" ? doc.fullPath : null;
};

type Candidate = { remainder: string; row: RedirectRowDoc };

const lookupOnce = async ({
  locale,
  path,
  payload,
}: {
  locale: string | null;
  path: string;
  payload: Payload;
}): Promise<{ target: ItemRef; to: string } | null> => {
  const normalized = normalizePath(path);
  const prefixes = prefixesOf(normalized);
  if (prefixes.length === 0) {
    return null;
  }

  // Query 1: the exact path and every prefix of it, keyed by locale.
  const { docs } = await payload.db.find({
    collection: toCollectionSlug(folderRedirectsSlug),
    pagination: false,
    where: { lookupKey: { in: prefixes.map((prefix) => lookupKeyOf(locale, prefix)) } },
  });
  const rows = docs as unknown as RedirectRowDoc[];
  const rowAt = (prefix: string, kind: RedirectRowDoc["kind"]): RedirectRowDoc | undefined =>
    rows.find((row) => row.lookupKey === lookupKeyOf(locale, prefix) && row.kind === kind);

  // An exact page row wins; otherwise the longest folder prefix.
  const candidates: Candidate[] = [];
  const exact = rowAt(prefixes[0], "page");
  if (exact) {
    candidates.push({ remainder: "", row: exact });
  }
  for (const prefix of prefixes) {
    const row = rowAt(prefix, "folderPrefix");
    if (row) {
      candidates.push({ remainder: normalized.slice(prefix.length), row });
    }
  }

  // Query 2: where the winner's target is now. A target that is gone or unpublished gives way to
  // the next candidate, which only a stale row can cause.
  for (const { remainder, row } of candidates) {
    if (!row.target) {
      continue;
    }
    const target: ItemRef = { collection: row.target.relationTo, id: targetIdOf(row.target.value) };
    const currentPath = await readCurrentPath({ locale, payload, target });
    if (currentPath === null) {
      continue;
    }
    const to = remainder === "" ? currentPath : joinPath(currentPath, remainder);
    // A stale row can name a folder that sits at the old path again: the answer would be the
    // request itself, a 301 loop. It gives way to the next candidate like a missing target.
    if (to !== normalized) {
      return { target, to };
    }
  }

  return null;
};

/**
 * Spec section 5.6: where a path that resolved to nothing went. One query finds the rows for the
 * path and every prefix of it in `locale` (an exact `page` row wins, otherwise the longest
 * `folderPrefix` row), and one reads where that row's target is now, so a page moved twice
 * redirects straight to its last path, and a prefix row appends the rest of the path to the
 * folder's current one. Two queries in the common case; more only for a chain of rows.
 *
 * It does not check that anything lives at the answer unless `isLive` is given, in which case
 * the lookup repeats on a dead answer, at most 3 hops, and returns `null` when none is live.
 */
export const findRedirect = async (
  payload: Payload,
  { isLive, locale = null, path }: FindRedirectArgs
): Promise<FoundRedirect | null> => {
  // Fails early on a Payload instance without the plugin, as every server function does.
  getResolvedOptions(payload);
  // A localized app keys its rows by locale, so a call that names none reads the default locale's.
  const defaultLocale = payload.config.localization
    ? payload.config.localization.defaultLocale
    : null;
  const localeOrNull = locale === noLocaleKey ? null : (locale ?? defaultLocale);

  let current = path;
  for (let hop = 1; hop <= maxRedirectHops; hop += 1) {
    const found = await lookupOnce({ locale: localeOrNull, path: current, payload });
    if (!found) {
      return null;
    }
    if (!isLive || (await isLive(found.to))) {
      return { hops: hop, status: 301, target: found.target, to: found.to };
    }
    current = found.to;
  }

  return null;
};
