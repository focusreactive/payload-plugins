import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { FolderId } from "../../types.js";
import { fetchUrlHistory } from "../api.js";
import type { FoldersApiContext, UrlHistoryEntry } from "../api.js";
import type { Translate } from "../compat.js";
import { formatAbsoluteTime } from "../Tree/relativeTime.js";

type Loaded = { entries: UrlHistoryEntry[]; key: string } | { error: string; key: string };

/**
 * The URL history of one document: the old paths that now redirect to it (spec sections 5.6 and
 * 7.8). Collapsed until the editor opens it, because most documents have none or only a few.
 */
export const UrlHistoryList = ({
  apiContext,
  collection,
  id,
  language,
  refreshKey = 0,
  translate,
}: {
  apiContext: FoldersApiContext;
  collection: string;
  id: FolderId;
  language: string;
  /** Changes when the document's URLs may have changed, so the list reads again. */
  refreshKey?: number | string;
  translate: Translate;
}): ReactNode => {
  const key = `${collection}:${id}:${refreshKey}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const read = async () => {
      try {
        const entries = await fetchUrlHistory(apiContext, { collection, id });
        if (isCurrent) {
          setLoaded({ entries, key });
        }
      } catch (error) {
        if (isCurrent) {
          setLoaded({ error: error instanceof Error ? error.message : "", key });
        }
      }
    };
    void read();

    return () => {
      isCurrent = false;
    };
  }, [apiContext, collection, id, key]);

  const current = loaded?.key === key ? loaded : null;
  const entries = current && "entries" in current ? current.entries : null;

  return (
    <details className="fr-folders-history" data-testid="url-history">
      <summary className="fr-folders-field__label" data-testid="url-history-summary">
        {translate("urlHistoryTitle")}
        {entries === null ? "" : ` (${entries.length})`}
      </summary>
      {current === null ? <p className="fr-folders-muted">{translate("loading")}</p> : null}
      {current && "error" in current ? (
        <p className="fr-folders-error" role="alert">
          {translate("urlHistoryFailed")}
          {current.error === "" ? "" : `: ${current.error}`}
        </p>
      ) : null}
      {entries !== null && entries.length === 0 ? (
        <p className="fr-folders-muted">{translate("urlHistoryEmpty")}</p>
      ) : null}
      {entries !== null && entries.length > 0 ? (
        <ul className="fr-folders-history__list" data-testid="url-history-list">
          {entries.map((entry) => (
            <li key={String(entry.id)}>
              <code>{entry.fromPath}</code>
              {entry.kind === "folderPrefix" ? (
                <span className="fr-folders-muted"> {translate("urlHistoryPrefix")}</span>
              ) : null}
              {entry.locale === null ? null : (
                <span className="fr-folders-muted"> ({entry.locale})</span>
              )}
              <span className="fr-folders-muted">
                {" "}
                {formatAbsoluteTime(entry.createdAt, language)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
};
