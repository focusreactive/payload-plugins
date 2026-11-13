import type { FolderId } from "../../types.js";

/** The document the edit view shows: which collection, and which row. */
export type OpenDocument = { collection: string; id: FolderId };

/** What a document id may look like in the address; the same rule as `?folder=`. */
const idPattern = /^[\w-]+$/u;

/** Route segments after the collection that are views of the collection, not documents. */
const notDocumentIds = new Set(["create", "trash"]);

/** A number-looking id is a number, as the move requests and the tree rows have it. */
const idOf = (value: string): FolderId => (String(Number(value)) === value ? Number(value) : value);

/**
 * The document the admin's current address is the edit view of, `null` anywhere else. The route
 * params of the admin's catch-all (`segments`: `collections`, the slug, the id, ...) say it when
 * the router has them; the path says it otherwise, because the tab lives in the navigation, which
 * is outside the page and may not be handed the params of the page's route. Only the collections
 * the tree shows count.
 */
export const openDocumentOf = ({
  adminRoute,
  collections,
  params,
  pathname,
}: {
  adminRoute: string;
  collections: readonly string[];
  params: Readonly<Record<string, string | string[] | undefined>> | null;
  pathname: string | null;
}): OpenDocument | null => {
  const fromParams = params?.segments;
  const fromPath =
    pathname !== null && (pathname === adminRoute || pathname.startsWith(`${adminRoute}/`))
      ? pathname
          .slice(adminRoute.length)
          .split("/")
          .filter((segment) => segment !== "")
      : null;
  const segments = Array.isArray(fromParams) ? fromParams : fromPath;
  if (segments === null) {
    return null;
  }
  const [area, collection, id] = segments;
  if (
    area !== "collections" ||
    collection === undefined ||
    id === undefined ||
    !collections.includes(collection) ||
    notDocumentIds.has(id) ||
    !idPattern.test(id)
  ) {
    return null;
  }

  return { collection, id: idOf(id) };
};
