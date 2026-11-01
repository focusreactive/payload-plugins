import { useEffect, useState } from "react";

import type { TreeItem } from "../../types.js";
import { fetchSearch } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { SearchScope } from "../TreeView/treeUrlState.js";
import { apiStatusesOf, searchResultLimit } from "./searchLogic.js";
import type { SearchFilters } from "./searchLogic.js";

export type SearchState = {
  /** The last failure, cleared by the next answer. */
  error: string | null;
  /** The names of the folders above the hits, by id. */
  folders: Readonly<Record<string, string>>;
  /** A request is out; the hits shown are from the one before. */
  isLoading: boolean;
  items: readonly TreeItem[];
  /** The hits shown answer the text now in the address (not an earlier one). */
  isCurrent: boolean;
  /** Reads the hits again. */
  retry: () => void;
  truncated: boolean;
};

type Answer = {
  error: string | null;
  folders: Readonly<Record<string, string>>;
  items: readonly TreeItem[];
  /** The request this answer belongs to. */
  requestKey: string;
  /** What the request searched for, without the revision: when it differs the hits are stale. */
  searchKey: string;
  truncated: boolean;
};

const emptyAnswer: Answer = {
  error: null,
  folders: {},
  items: [],
  requestKey: "",
  searchKey: "",
  truncated: false,
};

/**
 * The hits of the text in the address, read from `GET /search`. The text arrives already debounced
 * (the box writes it into the address after the last keystroke), so every change here is one
 * request, and one still out when the next starts is dropped. The hits on screen stay until the
 * next answer lands, so the list does not blink between two letters. `revision` makes a change
 * somewhere in the tree read them again: a move changes paths.
 */
export const useSearch = ({
  apiContext,
  enabled,
  filters,
  folderId,
  locale,
  query,
  revision,
  scope,
}: {
  apiContext: FoldersApiContext;
  enabled: boolean;
  filters: SearchFilters;
  /** The zoomed folder; `null` is the top level. */
  folderId: number | string | null;
  locale: string | null;
  query: string;
  revision: number | null;
  scope: SearchScope;
}): SearchState => {
  const [answer, setAnswer] = useState<Answer>(emptyAnswer);
  const [attempt, setAttempt] = useState(0);
  const text = query.trim();
  const isActive = enabled && text !== "";
  const requestKey = JSON.stringify([
    text,
    scope,
    folderId,
    locale,
    filters.types,
    filters.statuses,
    revision,
    attempt,
  ]);
  const searchKey = JSON.stringify([
    text,
    scope,
    folderId,
    locale,
    filters.types,
    filters.statuses,
  ]);

  useEffect(() => {
    if (!isActive) {
      setAnswer(emptyAnswer);

      return undefined;
    }
    const controller = new AbortController();
    const read = async (): Promise<void> => {
      try {
        const response = await fetchSearch(
          apiContext,
          {
            folder: folderId,
            limit: searchResultLimit,
            locale,
            query: text,
            scope,
            status: apiStatusesOf(filters.statuses),
            types: filters.types.length === 0 ? undefined : [...filters.types],
          },
          controller.signal
        );
        setAnswer({
          error: null,
          folders: response.folders,
          items: response.items,
          requestKey,
          searchKey,
          truncated: response.truncated,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setAnswer((previous) => ({
          ...previous,
          error: error instanceof Error ? error.message : "The search failed",
          requestKey,
          searchKey,
        }));
      }
    };
    void read();

    return () => controller.abort();
    // `requestKey` stands for every input read above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, requestKey]);

  return {
    error: isActive ? answer.error : null,
    folders: answer.folders,
    isCurrent: isActive && answer.searchKey === searchKey,
    isLoading: isActive && answer.requestKey !== requestKey,
    items: isActive ? answer.items : [],
    retry: () => setAttempt((current) => current + 1),
    truncated: isActive && answer.truncated,
  };
};
