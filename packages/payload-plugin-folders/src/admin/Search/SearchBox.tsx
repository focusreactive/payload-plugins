import { CheckboxInput, FilterIcon, FolderIcon, SearchIcon, XIcon } from "@payloadcms/ui";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import type { Translate } from "../compat.js";
import type { SearchScope } from "../TreeView/treeUrlState.js";
import {
  activeFilterCount,
  searchDebounceMs,
  statusFilterChoices,
  toggled,
} from "./searchLogic.js";
import type { SearchFilters, StatusFilter } from "./searchLogic.js";

const statusLabelKeys = {
  changed: "statusChanged",
  draft: "statusDraft",
  published: "statusPublished",
} as const satisfies Record<StatusFilter, string>;

export type SearchTypeOption = { label: string; value: string };

export type SearchBoxProps = {
  filters: SearchFilters;
  /** The sidebar tab: the text box alone, without the scope toggle and the filters. */
  isCompact?: boolean;
  /** A search is on: the filters apply to its hits, so the filter button shows. */
  isSearching: boolean;
  /** The folder the view is zoomed into; `false` at the top level, where there is nothing narrower than everything. */
  isZoomed: boolean;
  onFiltersChange: (filters: SearchFilters) => void;
  /** Arrow Down in the box: the first hit takes the focus. */
  onFocusResults: () => void;
  /** The text, after the debounce; an empty text leaves search mode. */
  onQueryChange: (query: string) => void;
  /** Escape with nothing typed: the box lets go and the tree takes the focus back. */
  onReturnToTree: () => void;
  onScopeChange: (scope: SearchScope) => void;
  /** The text in the address. */
  query: string;
  scope: SearchScope;
  /** What the search covers, by name: the zoomed folder, or the collection's own title. */
  coverName: string;
  /** The zoomed folder's name, for the toggle's label; the collection's title at the top level. */
  folderName: string;
  translate: Translate;
  typeOptions: readonly SearchTypeOption[];
};

/**
 * The search box of the header (spec section 7.2): the scope toggle, the text, and the filters. The
 * text goes into the address a moment after the last key, which is what searches; Enter does not
 * wait.
 */
export const SearchBox = ({
  coverName,
  filters,
  folderName,
  isCompact = false,
  isSearching,
  isZoomed,
  onFiltersChange,
  onFocusResults,
  onQueryChange,
  onReturnToTree,
  onScopeChange,
  query,
  scope,
  translate,
  typeOptions,
}: SearchBoxProps): ReactNode => {
  const [text, setText] = useState(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committed = useRef(query);
  const filtersId = useId();

  // The address changed under the box (Back, a link): the box shows what it says now.
  useEffect(() => {
    if (query !== committed.current) {
      committed.current = query;
      setText(query);
    }
  }, [query]);
  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  const commit = (next: string) => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (next !== committed.current) {
      committed.current = next;
      onQueryChange(next);
    }
  };

  const handleChange = (next: string) => {
    setText(next);
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => commit(next), searchDebounceMs);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(text);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (text !== "" || isSearching) {
        setText("");
        commit("");
      } else {
        onReturnToTree();
      }
    } else if (event.key === "ArrowDown" && isSearching) {
      event.preventDefault();
      commit(text);
      onFocusResults();
    }
  };

  const isScoped = isZoomed && scope === "folder";
  const placeholder = translate("searchPlaceholder", { name: coverName });
  const filterCount = activeFilterCount(filters);

  return (
    <div
      aria-label={translate(isCompact ? "searchLandmarkTab" : "searchLandmarkView")}
      className="fr-folders-search"
      data-testid="search-bar"
      role="search"
    >
      <div className="fr-folders-search__row">
        {isCompact ? null : (
          <button
            aria-label={translate(isZoomed ? "searchScopeFolder" : "searchScopeNeedsFolder", {
              name: folderName,
            })}
            aria-pressed={isScoped}
            className="fr-folders-search__scope"
            data-testid="search-scope"
            disabled={!isZoomed}
            onClick={() => onScopeChange(scope === "all" ? "folder" : "all")}
            title={translate(isZoomed ? "searchScopeFolder" : "searchScopeNeedsFolder", {
              name: folderName,
            })}
            type="button"
          >
            <FolderIcon size={16} />
          </button>
        )}
        <div className="fr-folders-search__field">
          <span aria-hidden="true" className="fr-folders-search__icon">
            <SearchIcon />
          </span>
          <input
            aria-label={translate("searchLabel")}
            autoComplete="off"
            className="fr-folders-search__input"
            data-testid="search-input"
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck={false}
            type="text"
            value={text}
          />
          {text === "" ? null : (
            <button
              aria-label={translate("searchClear")}
              className="fr-folders-search__clear"
              data-testid="search-clear"
              onClick={() => {
                setText("");
                commit("");
              }}
              type="button"
            >
              <XIcon />
            </button>
          )}
        </div>
        {isSearching && !isCompact ? (
          <button
            aria-controls={filtersId}
            aria-expanded={filtersOpen}
            className="fr-folders-search__filter-button"
            data-testid="search-filters-button"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
          >
            <FilterIcon />
            {filterCount === 0
              ? translate("searchFilters")
              : translate("searchFiltersActive", { count: filterCount })}
          </button>
        ) : null}
      </div>
      {isSearching && filtersOpen ? (
        <div className="fr-folders-search__filters" data-testid="search-filters" id={filtersId}>
          <fieldset className="fr-folders-search__group">
            <legend>{translate("searchFilterType")}</legend>
            {typeOptions.map((option) => (
              <CheckboxInput
                checked={filters.types.includes(option.value)}
                id={`${filtersId}-type-${option.value}`}
                key={option.value}
                label={option.label}
                onToggle={() =>
                  onFiltersChange({ ...filters, types: toggled(filters.types, option.value) })
                }
              />
            ))}
          </fieldset>
          <fieldset className="fr-folders-search__group">
            <legend>{translate("searchFilterStatus")}</legend>
            {statusFilterChoices.map((status) => (
              <CheckboxInput
                checked={filters.statuses.includes(status)}
                id={`${filtersId}-status-${status}`}
                key={status}
                label={translate(statusLabelKeys[status])}
                onToggle={() =>
                  onFiltersChange({ ...filters, statuses: toggled(filters.statuses, status) })
                }
              />
            ))}
          </fieldset>
        </div>
      ) : null}
    </div>
  );
};
