import { Button } from "@payloadcms/ui";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";

/**
 * What a search says above its hits, read out as it changes: how many there are and where they were
 * looked for, or that the search is still running. When the matches were cut off at the limit the
 * endpoint reads, it says so.
 */
export const SearchSummary = ({
  coverName,
  count,
  isLoading,
  query,
  translate,
  truncated,
}: {
  coverName: string;
  count: number;
  isLoading: boolean;
  query: string;
  translate: Translate;
  truncated: boolean;
}): ReactNode => (
  <div className="fr-folders-search-summary" data-testid="search-summary">
    <p className="fr-folders-muted" role="status">
      {isLoading
        ? translate("searchSearching")
        : translate("searchSummary", { count, name: coverName, query: query.trim() })}
    </p>
    {truncated ? (
      <p className="fr-folders-muted" data-testid="search-truncated">
        {translate("searchTruncated")}
      </p>
    ) : null}
  </div>
);

/** No hits: says so, and offers the wider search when this one was limited to a folder. */
export const SearchEmpty = ({
  coverName,
  onSearchEverywhere,
  query,
  translate,
}: {
  coverName: string;
  /** Present when the search was limited to a folder. */
  onSearchEverywhere: (() => void) | null;
  query: string;
  translate: Translate;
}): ReactNode => (
  <section className="fr-folders-empty-panel" data-testid="search-empty">
    <h2 className="fr-folders-empty-panel__title">
      {translate("searchNoResults", { name: coverName, query: query.trim() })}
    </h2>
    {onSearchEverywhere === null ? null : (
      <div className="fr-folders-empty-panel__actions">
        <Button
          buttonStyle="primary"
          extraButtonProps={{ "data-testid": "search-everywhere" }}
          margin={false}
          onClick={onSearchEverywhere}
          size="medium"
        >
          {translate("searchEverywhere")}
        </Button>
      </div>
    )}
  </section>
);

export const SearchError = ({
  message,
  onRetry,
  translate,
}: {
  message: string;
  onRetry: () => void;
  translate: Translate;
}): ReactNode => (
  <section className="fr-folders-empty-panel" data-testid="search-error">
    <h2 className="fr-folders-empty-panel__title" role="alert">
      {translate("searchFailed")}
    </h2>
    <p className="fr-folders-muted">{message}</p>
    <div className="fr-folders-empty-panel__actions">
      <Button buttonStyle="secondary" margin={false} onClick={onRetry} size="medium">
        {translate("retry")}
      </Button>
    </div>
  </section>
);
