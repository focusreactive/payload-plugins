import { Button, ChevronIcon, FolderIcon, ShimmerEffect, Tooltip } from "@payloadcms/ui";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";

import type { FolderId, TreeItem } from "../../types.js";
import { fetchSearch } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import { rootKey } from "../store.js";
import type { FolderKey, TreeStore } from "../store.js";
import { useTreeStoreState } from "../useTreeStore.js";
import { pickerRowsOf } from "./folderPicker.js";
import type { PickerRow } from "./folderPicker.js";

const searchDelayMs = 250;

/** The folder picked in the picker; `id` is `null` for the top level. */
export type FolderChoice = { id: FolderId | null; title: string };

type TargetRowProps = {
  /** The row whose reason is showing: one for the whole picker, so hover and focus never show two. */
  activeReasonKey: string | null;
  chevron?: { expanded: boolean; onToggle: () => void; title: string; visible: boolean };
  isSelected: boolean;
  level: number;
  onActivateReason: (key: string | null) => void;
  onSelect: () => void;
  refusal: string | null;
  rowKey: string;
  secondary?: string;
  testId: string;
  title: string;
};

const TargetRow = ({
  activeReasonKey,
  chevron,
  isSelected,
  level,
  onActivateReason,
  onSelect,
  refusal,
  rowKey,
  secondary,
  testId,
  title,
}: TargetRowProps) => {
  const select = () => {
    if (refusal === null) {
      onSelect();
    }
  };
  // The latest of hover and focus wins, and leaving or blurring only clears the row's own claim.
  const claimReason = () => {
    if (refusal !== null) {
      onActivateReason(rowKey);
    }
  };
  const releaseReason = () => {
    if (activeReasonKey === rowKey) {
      onActivateReason(null);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select();
    }
    // The tree keys: Right opens a closed folder, Left closes an open one. A folder that cannot
    // take the selection still opens, because the folders inside it have their own answers.
    if (chevron?.visible && event.key === "ArrowRight" && !chevron.expanded) {
      event.preventDefault();
      chevron.onToggle();
    }
    if (chevron?.visible && event.key === "ArrowLeft" && chevron.expanded) {
      event.preventDefault();
      chevron.onToggle();
    }
  };

  return (
    <div
      aria-disabled={refusal === null ? undefined : true}
      aria-expanded={chevron?.visible ? chevron.expanded : undefined}
      aria-level={level + 1}
      aria-selected={isSelected}
      className={[
        "fr-folders-picker__row",
        isSelected ? "fr-folders-picker__row--selected" : "",
        refusal === null ? "" : "fr-folders-picker__row--disabled",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
      data-title={title}
      onBlur={releaseReason}
      onClick={select}
      onFocus={claimReason}
      onKeyDown={handleKeyDown}
      onMouseEnter={claimReason}
      onMouseLeave={releaseReason}
      role="treeitem"
      style={{ paddingInlineStart: `calc(var(--spacer-1) + ${level * 16}px)` }}
      tabIndex={0}
    >
      {chevron?.visible ? (
        <button
          aria-label={chevron.title}
          className="fr-folders-chevron"
          data-testid="picker-expand"
          onClick={(event) => {
            event.stopPropagation();
            chevron.onToggle();
          }}
          type="button"
        >
          <ChevronIcon direction={chevron.expanded ? "down" : "right"} size={16} />
        </button>
      ) : (
        <span aria-hidden="true" className="fr-folders-chevron fr-folders-chevron--empty" />
      )}
      <span aria-hidden="true" className="fr-folders-kind-icon">
        <FolderIcon size={16} />
      </span>
      <span className="fr-folders-picker__title">
        {title}
        {refusal === null ? null : (
          <Tooltip position="top" show={activeReasonKey === rowKey}>
            {refusal}
          </Tooltip>
        )}
      </span>
      {secondary ? (
        <span className="fr-folders-muted fr-folders-picker__path">{secondary}</span>
      ) : null}
      {refusal === null ? null : <span className="fr-folders-visually-hidden">{refusal}</span>}
    </div>
  );
};

export type FolderPickerTreeProps = {
  /** The folder that is picked now, `null` before the first pick. */
  choice: FolderChoice | null;
  context: FoldersApiContext;
  /** The slug of the folders collection, from the plugin's settings. */
  foldersSlug: string;
  onChoose: (choice: FolderChoice) => void;
  /**
   * Why a folder cannot be picked, `null` when it can. The top level (`null`) is never asked: it
   * takes anything.
   */
  refusalFor: (target: TreeItem | null) => string | null;
  store: TreeStore;
  translate: Translate;
};

/**
 * The folders-only tree of spec section 7.9 with its search box, on the shared store: "Content (top
 * level)", then the folders of every folder the picker opened. The Move to... dialog and the New
 * folder dialog's parent field both use it; each says which folders are off and what to do on a pick.
 */
export const FolderPickerTree = ({
  choice,
  context,
  foldersSlug,
  onChoose,
  refusalFor,
  store,
  translate,
}: FolderPickerTreeProps) => {
  const state = useTreeStoreState(store);
  const [expanded, setExpanded] = useState<ReadonlySet<FolderKey>>(() => new Set());
  const [activeReasonKey, setActiveReasonKey] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchHits, setSearchHits] = useState<{
    items: TreeItem[];
    status: "idle" | "loading" | "ready";
  }>({ items: [], status: "idle" });

  // The shared store already has the top level when the tree is behind the dialog; this reads it
  // again when it is stale and covers the dialog being opened before the tree has loaded.
  useEffect(() => {
    void store.loadChildren(null);
  }, [store]);

  const rows = useMemo(
    () => pickerRowsOf(state, expanded, translate("moveToRoot")),
    [state, expanded, translate]
  );

  const toggleFolder = (key: FolderKey) => {
    const opening = !expanded.has(key);
    setExpanded((current) => {
      const next = new Set(current);
      if (opening) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
    if (opening) {
      void store.loadChildren(key);
    }
  };

  // Searches the folders, everywhere, once the editor stops typing.
  useEffect(() => {
    const text = searchText.trim();
    if (text === "") {
      setSearchHits({ items: [], status: "idle" });

      return undefined;
    }
    setSearchHits((current) => ({ ...current, status: "loading" }));
    const controller = new AbortController();
    const search = async () => {
      try {
        const response = await fetchSearch(
          context,
          {
            folder: null,
            locale: store.getOptions()?.locale ?? null,
            query: text,
            scope: "all",
            types: [foldersSlug],
          },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setSearchHits({ items: response.items, status: "ready" });
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchHits({ items: [], status: "ready" });
        }
      }
    };
    const timer = setTimeout(() => void search(), searchDelayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [context, foldersSlug, searchText, store]);

  const searching = searchText.trim() !== "";

  return (
    <>
      <input
        aria-label={translate("moveToSearchLabel")}
        className="fr-folders-picker__search"
        data-testid="picker-search"
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={translate("moveToSearchPlaceholder")}
        type="search"
        value={searchText}
      />
      <div
        aria-label={translate("moveToTreeLabel")}
        className="fr-folders-picker__tree"
        data-testid="picker-tree"
        role="tree"
      >
        {searching ? (
          <>
            {searchHits.status === "loading" ? (
              <div aria-label={translate("moveToSearching")} aria-busy="true" role="status">
                <ShimmerEffect height="14px" width="40%" />
              </div>
            ) : null}
            {searchHits.status === "ready" && searchHits.items.length === 0 ? (
              <p className="fr-folders-muted fr-folders-picker__note">
                {translate("moveToNoResults", { query: searchText.trim() })}
              </p>
            ) : null}
            {searchHits.items.map((hit) => (
              <TargetRow
                activeReasonKey={activeReasonKey}
                isSelected={
                  choice !== null && choice.id !== null && String(choice.id) === String(hit.id)
                }
                key={`${hit.collection}:${hit.id}`}
                level={0}
                onActivateReason={setActiveReasonKey}
                onSelect={() => onChoose({ id: hit.id, title: hit.title })}
                refusal={refusalFor(hit)}
                rowKey={`hit:${hit.collection}:${hit.id}`}
                secondary={hit.fullPath}
                testId="picker-row"
                title={hit.title}
              />
            ))}
          </>
        ) : (
          rows.map((row: PickerRow) => {
            switch (row.kind) {
              case "folder": {
                const isRoot = row.item === null;

                return (
                  <TargetRow
                    activeReasonKey={activeReasonKey}
                    chevron={
                      isRoot
                        ? undefined
                        : {
                            expanded: row.expanded,
                            onToggle: () => toggleFolder(String(row.id)),
                            title: translate(row.expanded ? "collapse" : "expand", {
                              name: row.title,
                            }),
                            visible: row.expandable,
                          }
                    }
                    isSelected={
                      choice !== null &&
                      (isRoot
                        ? choice.id === null
                        : choice.id !== null && String(choice.id) === String(row.id))
                    }
                    key={row.key}
                    level={row.level}
                    onActivateReason={setActiveReasonKey}
                    onSelect={() => onChoose({ id: row.id, title: row.title })}
                    refusal={isRoot ? null : refusalFor(row.item)}
                    rowKey={row.key}
                    testId={isRoot ? "picker-root" : "picker-row"}
                    title={row.title}
                  />
                );
              }
              case "loading": {
                return (
                  <div
                    aria-busy="true"
                    className="fr-folders-picker__note"
                    key={row.key}
                    role="status"
                    style={{
                      paddingInlineStart: `calc(var(--spacer-1) + ${row.level * 16}px)`,
                    }}
                  >
                    <ShimmerEffect height="14px" width="40%" />
                  </div>
                );
              }
              case "empty": {
                return (
                  <p
                    className="fr-folders-muted fr-folders-picker__note"
                    key={row.key}
                    style={{
                      paddingInlineStart: `calc(var(--spacer-5) + ${row.level * 16}px)`,
                    }}
                  >
                    {translate("moveToEmptyFolder")}
                  </p>
                );
              }
              case "load-more": {
                return (
                  <div
                    className="fr-folders-picker__note"
                    key={row.key}
                    style={{
                      paddingInlineStart: `calc(var(--spacer-5) + ${row.level * 16}px)`,
                    }}
                  >
                    <Button
                      buttonStyle="secondary"
                      disabled={row.loading}
                      margin={false}
                      onClick={() =>
                        void store.loadMore(row.parentKey === rootKey ? null : row.parentKey)
                      }
                      size="medium"
                    >
                      {row.loading
                        ? translate("loadingMore")
                        : translate("loadMore", { count: store.getOptions()?.pageSize ?? 100 })}
                    </Button>
                  </div>
                );
              }
              default: {
                return (
                  <div className="fr-folders-picker__note" key={row.key}>
                    <span className="fr-folders-error" role="alert">
                      {translate("loadError")}
                    </span>
                    <Button
                      buttonStyle="secondary"
                      margin={false}
                      onClick={() =>
                        void store.loadChildren(row.parentKey === rootKey ? null : row.parentKey)
                      }
                      size="medium"
                    >
                      {translate("retry")}
                    </Button>
                  </div>
                );
              }
            }
          })
        )}
      </div>
    </>
  );
};
