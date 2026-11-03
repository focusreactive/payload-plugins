import { useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useState } from "react";

import type { FolderId } from "../../types.js";
import { fetchDocument } from "../api.js";
import { useAdminRoutes, useLocaleCode } from "../compat.js";
import { sharedRead } from "./sharedRead.js";

/** The page as its live row has it: what the site serves, which the form's draft may differ from. */
export type LivePage = {
  isFolderRoot: boolean;
  /** Published in this locale; a page that only ever was a draft has no live URL yet. */
  isPublished: boolean;
  /** The segment the live row shows in the admin locale, the default locale's when it has none. */
  segment: string;
};

type Loaded = { key: string; live: LivePage | null };

/**
 * The page's live row, for the edit view's URL hint and draft warning. `undefined` while it loads,
 * `null` when it cannot be read. It is read again after every save of the form, autosaves included,
 * and the fields that ask at the same time share one request.
 */
export const useLivePage = ({
  collection,
  id,
  segmentField,
}: {
  collection: string | undefined;
  id: FolderId | undefined;
  segmentField: string;
}): LivePage | null | undefined => {
  const { apiBaseUrl } = useAdminRoutes();
  const locale = useLocaleCode();
  const { lastUpdateTime } = useDocumentInfo();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${collection}:${id}:${locale}:${segmentField}:${String(lastUpdateTime)}`;

  useEffect(() => {
    if (collection === undefined || id === undefined) {
      return undefined;
    }
    let isCurrent = true;
    const read = async () => {
      try {
        const row = await sharedRead(`live:${key}`, () =>
          fetchDocument<Record<string, unknown> & { _status?: string }>(
            { baseUrl: apiBaseUrl },
            { collection, draft: false, fallback: true, id, locale }
          )
        );
        if (isCurrent) {
          setLoaded({
            key,
            live: {
              isFolderRoot: row.isFolderRoot === true,
              // A collection without drafts has no status: every row is live.
              isPublished: row._status === undefined || row._status === "published",
              segment: typeof row[segmentField] === "string" ? row[segmentField] : "",
            },
          });
        }
      } catch {
        if (isCurrent) {
          setLoaded({ key, live: null });
        }
      }
    };
    void read();

    return () => {
      isCurrent = false;
    };
  }, [apiBaseUrl, collection, id, key, locale, segmentField]);

  // The previous answer stays until the next one lands, so the hint does not blink on a save.
  return loaded === null ? undefined : loaded.live;
};
