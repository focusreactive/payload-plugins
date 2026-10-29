import type { Payload } from "payload";

import type { ResolvedOptions } from "../types.js";
import type { FolderRecord } from "./folderRecords.js";
import { joinPath } from "./paths.js";
import { folderPathIn } from "./uniqueness.js";

/**
 * A page's full path in locale slot `key`, or `null` while it has no segment there or its folder
 * has no path there. A root page takes its folder's path (`/` at the site root).
 */
export const pagePathIn = ({
  folder,
  isFolderRoot,
  key,
  options,
  payload,
  segment,
}: {
  folder: FolderRecord | null;
  isFolderRoot: boolean;
  key: string;
  options: ResolvedOptions;
  payload: Payload;
  segment: string;
}): string | null => {
  const folderPath = folder ? folderPathIn(folder, key, options, payload) : "";
  if (folder && folderPath === "") {
    return null;
  }
  if (isFolderRoot) {
    return folder ? folderPath : "/";
  }

  return segment === "" ? null : joinPath(folderPath, segment);
};
