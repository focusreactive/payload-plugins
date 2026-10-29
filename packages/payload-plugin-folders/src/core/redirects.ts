import type { PayloadRequest } from "payload";

import type { FolderId, ResolvedOptions } from "../types.js";

export type FolderPrefixRedirect = {
  folder: FolderId;
  /** The locale whose path changed; `null` when localization is off. */
  locale: string | null;
  /** The folder's old full path, which stands for every path beneath it. */
  fromPath: string;
};

/**
 * The hook point where a rename or move writes one `folderPrefix` redirect row per changed locale
 * (spec section 5.6). It runs inside the write's transaction, so a failed rename leaves no row.
 * Does nothing until P-21 adds the redirects collection's writer.
 */
export const writeFolderPrefixRedirects = (_args: {
  options: ResolvedOptions;
  redirects: FolderPrefixRedirect[];
  req: PayloadRequest;
}): Promise<void> => Promise.resolve();
