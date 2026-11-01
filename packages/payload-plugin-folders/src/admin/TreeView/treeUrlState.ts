import type { FolderId } from "../../types.js";

/**
 * The most open folders the address carries. The list is also kept in the admin preferences, so
 * the address only has to be short enough for a browser and a proxy; the newest are kept.
 */
export const maxExpandedInUrl = 100;

/** What an id may look like in the address: Payload's number and text ids, nothing with a comma or a slash. */
const idPattern = /^[\w-]+$/u;

/**
 * A folder id from the address as the folders collection stores it. A number-looking id becomes a
 * number, because the move requests send this id back and a number id is a number there.
 */
const folderIdOf = (value: string): FolderId =>
  String(Number(value)) === value ? Number(value) : value;

/** `?folder=<id>`: the zoomed folder, `null` for no zoom and for a value that is not an id. */
export const parseFolderParam = (value: string | null): FolderId | null =>
  value !== null && idPattern.test(value) ? folderIdOf(value) : null;

/** `?expanded=<id>,<id>`: the open folders, `null` when the address says nothing about them. */
export const parseExpandedParam = (value: string | null): FolderId[] | null => {
  if (value === null) {
    return null;
  }
  const ids = value.split(",").filter((id) => idPattern.test(id));

  return [...new Set(ids)].map(folderIdOf);
};

/** The value of `?expanded=`; empty when nothing is open, which the address leaves out. */
export const formatExpandedParam = (folders: readonly FolderId[]): string =>
  folders.slice(-maxExpandedInUrl).join(",");

/**
 * The query string with some parameters set and some removed (`null`), the others kept as they
 * are, so the list view's own parameters and the other state of the tree survive.
 */
export const queryWith = (
  search: string,
  changes: Readonly<Record<string, string | null>>
): string => {
  const parameters = new URLSearchParams(search);
  for (const [name, value] of Object.entries(changes)) {
    if (value === null || value === "") {
      parameters.delete(name);
    } else {
      parameters.set(name, value);
    }
  }
  const text = parameters.toString();

  return text === "" ? "" : `?${text}`;
};

/** Where the open folders are kept in the admin preferences of the signed-in user. */
export const expandedPreferenceKey = "foldersTree.expanded";

/** The open folders out of what the preferences stored (`{ expanded: [...] }`); `null` for anything else. */
export const savedExpandedOf = (value: unknown): FolderId[] | null => {
  if (typeof value !== "object" || value === null || !("expanded" in value)) {
    return null;
  }
  const { expanded } = value;
  if (!Array.isArray(expanded)) {
    return null;
  }

  return parseExpandedParam(
    expanded.filter((id) => typeof id === "number" || typeof id === "string").join(",")
  );
};
