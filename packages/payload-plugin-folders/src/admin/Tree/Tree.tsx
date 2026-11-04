import { Button, CheckboxInput, ShimmerEffect } from "@payloadcms/ui";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useContentLocales } from "../compat.js";
import type { Translate } from "../compat.js";
import { DragStateContext } from "../DragAndDrop/dragState.js";
import { focusRowWhenShown, hasLostFocus, rowElementOf } from "../Keyboard/focusRow.js";
import type { TreeKeyboard } from "../Keyboard/useTreeKeyboard.js";
import type { MenuAnchor } from "../Menu/menuEntries.js";
import { MoveMarkerRow } from "../MoveMode/MoveMarkerRow.js";
import { markerReasonOf, tabbableMarkerKey } from "../MoveMode/moveMarkers.js";
import type { MoveMarker, MoveModeRow } from "../MoveMode/moveMarkers.js";
import type { SelectionApi } from "../useSelection.js";
import { folderKeyOf, itemKeyOf } from "../store.js";
import type { FolderKey, TreeStore } from "../store.js";
import type { TreeItem } from "../../types.js";
import { EmptyRow } from "./EmptyStates.js";
import type { EmptyCreateActions } from "./EmptyStates.js";
import { levelPadding } from "./levelPadding.js";
import { TreeRow } from "./TreeRow.js";
import type {
  ErrorRowModel,
  LoadMoreRowModel,
  StaleRowModel,
  TreeRowModel,
} from "./useTreeData.js";

/** What Move mode adds to the tree: the rows with a marker in every gap, and how a marker is picked. */
export type MoveModeView = {
  /** How many rows are moving, for the markers' label. */
  count: number;
  /** A move is in flight: no marker can be picked. */
  isBusy: boolean;
  onPick: (marker: MoveMarker) => void;
  placed: readonly MoveModeRow[];
};

/**
 * A tree with more rows than this on screen draws only the rows near the view (spec section 7.13).
 * Below it every row is in the page, as always: a list this short needs no help, and the plain
 * rows keep the browser's own find and focus behaviour.
 */
export const virtualizeAboveRows = 300;

/** What a row is worth before it has been measured: a name with its path under it. */
const estimatedRowHeight = 40;

/** Rows drawn beyond the view on each side, so a scroll shows rows at once. */
const rowOverscan = 8;

export type TreeProps = {
  adminRoute: string;
  /** The key of the row of the document open in the edit view (sidebar tab); it is highlighted. */
  currentKey?: string | null;
  /** What the empty row of an open folder with nothing in it starts. */
  emptyActions: EmptyCreateActions;
  /** The sidebar tab: the name and the status dot only, no header row. */
  isCompact?: boolean;
  /** Roving tab index, cut rows, live region and the element keys are read against. */
  keyboard: TreeKeyboard;
  /** The grid's accessible name: the tree's, or the search's hits. */
  label: string;
  language: string;
  onOpenFolder?: (folderId: number | string) => void;
  /** Set while Move mode is on. */
  moveMode?: MoveModeView;
  /** Opens a row's context menu; see `TreeRowProps.onOpenMenu`. */
  onOpenMenu: (item: TreeItem, anchor: MenuAnchor, returnFocus: HTMLElement | null) => void;
  onOpenPage: (url: string) => void;
  /** F2 on a row: opens its Settings. */
  onOpenSettings: (item: TreeItem) => void;
  /** The key of the row whose context menu is open. */
  openMenuItemKey: string | null;
  /** Rows per request, shown in the "Load more" label. */
  pageSize: number;
  /** The visible rows, from `useTreeData`: the caller reads them too, for the selection. */
  rows: readonly TreeRowModel[];
  selection: SelectionApi;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

const LoadingRow = ({
  ariaRowIndex,
  level,
  label,
}: {
  ariaRowIndex?: number;
  label: string;
  level: number;
}) => (
  <div
    aria-busy="true"
    aria-label={label}
    aria-level={level + 1}
    aria-rowindex={ariaRowIndex}
    className="fr-folders-row fr-folders-row--status"
    data-testid="loading-row"
    role="row"
  >
    <div
      className="fr-folders-cell fr-folders-cell--wide"
      role="gridcell"
      style={{ paddingInlineStart: levelPadding(level) }}
    >
      <ShimmerEffect height="14px" width="40%" />
    </div>
  </div>
);

const ErrorRow = ({
  ariaRowIndex,
  onRetry,
  row,
  translate,
}: {
  ariaRowIndex?: number;
  onRetry: (parentKey: FolderKey) => void;
  row: ErrorRowModel;
  translate: Translate;
}) => (
  <div
    aria-level={row.level + 1}
    aria-rowindex={ariaRowIndex}
    className="fr-folders-row fr-folders-row--status"
    data-testid="error-row"
    role="row"
  >
    <div
      className="fr-folders-cell fr-folders-cell--wide"
      role="gridcell"
      style={{ paddingInlineStart: levelPadding(row.level) }}
    >
      <span className="fr-folders-error" role="alert">
        {translate("loadError")}
        {row.message === "" ? "" : `: ${row.message}`}
      </span>
      <Button buttonStyle="secondary" onClick={() => onRetry(row.parentKey)} size="medium">
        {translate("retry")}
      </Button>
    </div>
  </div>
);

const StaleRow = ({
  ariaRowIndex,
  onRetry,
  row,
  translate,
}: {
  ariaRowIndex?: number;
  onRetry: (parentKey: FolderKey) => void;
  row: StaleRowModel;
  translate: Translate;
}) => (
  <div
    aria-level={row.level + 1}
    aria-rowindex={ariaRowIndex}
    className="fr-folders-row fr-folders-row--status"
    data-testid="stale-row"
    role="row"
  >
    <div
      className="fr-folders-cell fr-folders-cell--wide"
      role="gridcell"
      style={{ paddingInlineStart: levelPadding(row.level) }}
    >
      <span className="fr-folders-muted" title={row.message}>
        {translate("outOfDate")}
      </span>
      <Button buttonStyle="secondary" onClick={() => onRetry(row.parentKey)} size="medium">
        {translate("retry")}
      </Button>
    </div>
  </div>
);

const LoadMoreRow = ({
  ariaRowIndex,
  onLoadMore,
  pageSize,
  row,
  translate,
}: {
  ariaRowIndex?: number;
  /** `byKeyboard` is true for Enter or Space, which the tree answers by moving into the new rows. */
  onLoadMore: (parentKey: FolderKey, byKeyboard: boolean) => Promise<void>;
  pageSize: number;
  row: LoadMoreRowModel;
  translate: Translate;
}) => (
  <div
    aria-level={row.level + 1}
    aria-rowindex={ariaRowIndex}
    className="fr-folders-row fr-folders-row--status"
    data-testid="load-more-row"
    role="row"
  >
    <div
      className="fr-folders-cell fr-folders-cell--wide"
      role="gridcell"
      style={{ paddingInlineStart: levelPadding(row.level) }}
    >
      {/* Not `disabled`: a button that disables itself while it is focused drops the keyboard on the page. */}
      <Button
        buttonStyle="secondary"
        className={row.loading ? "btn--disabled" : undefined}
        extraButtonProps={{ "aria-disabled": row.loading }}
        onClick={(event) => {
          if (!row.loading) {
            // Enter and Space click with no pointer, so a click with a detail of 0 is the keyboard.
            void onLoadMore(row.parentKey, event.detail === 0);
          }
        }}
        size="medium"
      >
        {row.loading ? translate("loadingMore") : translate("loadMore", { count: pageSize })}
      </Button>
      {row.error === null ? null : (
        <span className="fr-folders-error" role="alert">
          {translate("loadError")}: {row.error}
        </span>
      )}
    </div>
  </div>
);

/** The key a displayed entry goes by: a row's own, or its marker's. */
const entryKeyOf = (entry: MoveModeRow): string =>
  entry.type === "marker" ? `marker:${entry.marker.key}` : entry.row.key;

/** The tree-grid of spec section 7.2: header row, then one row per visible folder and page. */
export const Tree = ({
  adminRoute,
  currentKey = null,
  emptyActions,
  isCompact = false,
  keyboard,
  label,
  language,
  moveMode,
  onOpenFolder,
  onOpenMenu,
  onOpenPage,
  onOpenSettings,
  openMenuItemKey,
  pageSize,
  rows,
  selection,
  store,
  translate,
  typeLabels,
}: TreeProps) => {
  const toggleFolder = useCallback(
    (folderId: number | string) => {
      void store.toggleExpanded(folderId);
    },
    [store]
  );
  const retry = useCallback(
    (parentKey: FolderKey) => {
      void store.loadChildren(parentKey === "root" ? null : parentKey);
    },
    [store]
  );

  // Move mode: why each marker is off, and the one marker that is in the tab order.
  const [activeMarkerKey, setActiveMarkerKey] = useState<string | null>(null);
  const entries = useMemo(
    () => moveMode?.placed ?? rows.map((row): MoveModeRow => ({ row, type: "row" })),
    [moveMode?.placed, rows]
  );
  const markers = entries.flatMap((entry) => (entry.type === "marker" ? [entry.marker] : []));
  const markerReasons = new Map(
    markers.map((marker) => [
      marker.key,
      markerReasonOf(marker, {
        count: moveMode?.count ?? 0,
        isBusy: moveMode?.isBusy ?? false,
        translate,
      }),
    ])
  );
  const tabbableKey = tabbableMarkerKey(
    markers.map((marker) => ({ isOff: markerReasons.get(marker.key) !== null, key: marker.key })),
    activeMarkerKey
  );

  // The total is unknown while any folder on screen has rows left to load or is still loading.
  const rowCountIsKnown = !rows.some((row) => row.type === "load-more" || row.type === "loading");

  // A long list draws only the rows near the view. The scrolling element is the body of the grid,
  // below the header row, so the header stays where it is.
  const isVirtual = entries.length > virtualizeAboveRows;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const entryKeys = useMemo(() => entries.map(entryKeyOf), [entries]);
  const indexByKey = useMemo(
    () => new Map(entryKeys.map((key, index) => [key, index])),
    [entryKeys]
  );
  // The row in the tab order, the marker in the tab order and the row being dragged are drawn
  // wherever the view is: Tab would have nothing to land on after a scroll, and a drag that
  // scrolls its own row out would lose the node dnd-kit measures its scroll parents from. The
  // drag overlay does not depend on the row (it is placed from the pointer), so a row that did
  // unmount would still be carried.
  const { grabbedKey } = useContext(DragStateContext);
  const { default: defaultLocale } = useContentLocales();
  const pinnedIndexes = useMemo(
    () =>
      [
        keyboard.activeKey === null ? undefined : indexByKey.get(keyboard.activeKey),
        tabbableKey === null ? undefined : indexByKey.get(`marker:${tabbableKey}`),
        grabbedKey === null ? undefined : indexByKey.get(grabbedKey),
      ].filter((index): index is number => index !== undefined),
    [grabbedKey, indexByKey, keyboard.activeKey, tabbableKey]
  );
  const virtualizer = useVirtualizer({
    count: entries.length,
    enabled: isVirtual,
    estimateSize: () => estimatedRowHeight,
    getItemKey: (index) => entryKeys[index] ?? index,
    getScrollElement: () => scrollRef.current,
    // The height the observer reports comes a frame late. A list that has just grown past the limit
    // would draw no rows until then, and every row, the focused one too, would be taken out of the
    // page for that frame.
    initialRect: { height: estimatedRowHeight * 20, width: 0 },
    overscan: rowOverscan,
    rangeExtractor: (range) =>
      [...new Set([...defaultRangeExtractor(range), ...pinnedIndexes])].toSorted(
        (left, right) => left - right
      ),
  });

  // Brings a row into view: the browser does it for a row in the page, the virtualizer for one
  // that is not drawn. The keyboard asks for it too (End on a long list).
  const revealRow = useCallback(
    (key: string) => {
      const index = indexByKey.get(key);
      if (index === undefined) {
        return;
      }
      if (isVirtual) {
        virtualizer.scrollToIndex(index, { align: "auto" });
      } else {
        const entry = entries[index];
        if (entry?.type === "row" && entry.row.type === "item") {
          rowElementOf(entry.row.item, keyboard.treeRef.current)?.scrollIntoView({
            block: "nearest",
          });
        }
      }
    },
    [entries, indexByKey, isVirtual, keyboard.treeRef, virtualizer]
  );
  useEffect(() => {
    keyboard.revealRowRef.current = revealRow;

    return () => {
      keyboard.revealRowRef.current = null;
    };
  }, [keyboard.revealRowRef, revealRow]);

  // A keyboard user who pressed Load more goes on in the rows that came in: the button stays (it is
  // only marked busy), so the focus is still on it when they arrive, and an ArrowDown from a button
  // would do nothing. The row is asked for after the render that draws it, because a long list has
  // to scroll to a row before it draws it.
  const [focusAfterLoad, setFocusAfterLoad] = useState<TreeItem | null>(null);
  const loadMore = useCallback(
    async (parentKey: FolderKey, byKeyboard: boolean) => {
      const parent = parentKey === "root" ? null : parentKey;
      const itemsOf = () => store.getState().childrenByFolder[folderKeyOf(parent)]?.items ?? [];
      const keysBefore = new Set(itemsOf().map(itemKeyOf));
      await store.loadMore(parent);
      if (byKeyboard) {
        setFocusAfterLoad(itemsOf().find((item) => !keysBefore.has(itemKeyOf(item))) ?? null);
      }
    },
    [store]
  );
  useEffect(() => {
    if (focusAfterLoad === null || !indexByKey.has(itemKeyOf(focusAfterLoad))) {
      return;
    }
    setFocusAfterLoad(null);
    revealRow(itemKeyOf(focusAfterLoad));
    focusRowWhenShown(
      focusAfterLoad,
      () => keyboard.treeRef.current,
      () => hasLostFocus() || keyboard.treeRef.current?.contains(document.activeElement) === true
    );
  }, [focusAfterLoad, indexByKey, keyboard.treeRef, revealRow]);

  // The document open in the edit view comes into view once, when its row first shows.
  const revealedCurrentKey = useRef<string | null>(null);
  const currentIndex = currentKey === null ? undefined : indexByKey.get(currentKey);
  useEffect(() => {
    if (currentKey === null) {
      revealedCurrentKey.current = null;

      return;
    }
    if (currentIndex !== undefined && revealedCurrentKey.current !== currentKey) {
      revealedCurrentKey.current = currentKey;
      revealRow(currentKey);
    }
  }, [currentIndex, currentKey, revealRow]);

  const headerRows = isCompact ? 0 : 1;
  const renderEntry = (entry: MoveModeRow, index: number) => {
    const ariaRowIndex = isVirtual ? index + 1 + headerRows : undefined;
    if (entry.type === "marker") {
      return (
        <MoveMarkerRow
          ariaRowIndex={ariaRowIndex}
          count={moveMode?.count ?? 0}
          isTabStop={entry.marker.key === tabbableKey}
          key={`marker:${entry.marker.key}`}
          marker={entry.marker}
          onFocused={(marker) => setActiveMarkerKey(marker.key)}
          onPick={moveMode?.onPick ?? (() => undefined)}
          reason={markerReasons.get(entry.marker.key) ?? null}
          translate={translate}
        />
      );
    }
    const { row } = entry;
    switch (row.type) {
      case "item": {
        return (
          <TreeRow
            adminRoute={adminRoute}
            ariaRowIndex={ariaRowIndex}
            defaultLocale={defaultLocale}
            isCompact={isCompact}
            isCurrent={currentKey === row.key}
            isCut={keyboard.cutKeys.has(row.key)}
            isMenuOpen={openMenuItemKey === row.key}
            isSelected={selection.isSelected(row.item)}
            isTabStop={keyboard.activeKey === row.key}
            key={row.key}
            language={language}
            onOpenFolder={onOpenFolder}
            onOpenMenu={onOpenMenu}
            onOpenPage={onOpenPage}
            onOpenSettings={onOpenSettings}
            onSelectRange={selection.selectRange}
            onToggleFolder={toggleFolder}
            onToggleSelect={selection.toggle}
            row={row}
            translate={translate}
            typeLabels={typeLabels}
          />
        );
      }
      case "loading": {
        return (
          <LoadingRow
            ariaRowIndex={ariaRowIndex}
            key={row.key}
            label={translate("loading")}
            level={row.level}
          />
        );
      }
      case "error": {
        return (
          <ErrorRow
            ariaRowIndex={ariaRowIndex}
            key={row.key}
            onRetry={retry}
            row={row}
            translate={translate}
          />
        );
      }
      case "empty": {
        return (
          <EmptyRow
            actions={emptyActions}
            ariaRowIndex={ariaRowIndex}
            folder={row.folder}
            key={row.key}
            level={row.level}
            translate={translate}
          />
        );
      }
      case "stale": {
        return (
          <StaleRow
            ariaRowIndex={ariaRowIndex}
            key={row.key}
            onRetry={retry}
            row={row}
            translate={translate}
          />
        );
      }
      case "load-more": {
        return (
          <LoadMoreRow
            ariaRowIndex={ariaRowIndex}
            key={row.key}
            onLoadMore={loadMore}
            pageSize={pageSize}
            row={row}
            translate={translate}
          />
        );
      }
      default: {
        return null;
      }
    }
  };

  return (
    <>
      <div
        aria-colcount={isCompact ? 2 : 6}
        aria-multiselectable="true"
        aria-label={label}
        aria-rowcount={rowCountIsKnown ? entries.length + headerRows : -1}
        className={[
          "fr-folders-tree",
          isCompact ? "fr-folders-tree--compact" : "",
          isVirtual ? "fr-folders-tree--virtual" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid="tree"
        onFocus={(event) => keyboard.onFocus(event.target)}
        ref={keyboard.bindTree}
        role="treegrid"
      >
        {isCompact ? null : (
          <div role="rowgroup">
            <div className="fr-folders-row fr-folders-row--header" role="row">
              <div className="fr-folders-cell fr-folders-cell--select" role="columnheader">
                <CheckboxInput
                  aria-label={translate("selectAllRows")}
                  checked={selection.headerState === "all"}
                  onToggle={selection.toggleAll}
                  partialChecked={selection.headerState === "some"}
                />
              </div>
              <div className="fr-folders-cell fr-folders-cell--name" role="columnheader">
                {translate("columnName")}
              </div>
              <div className="fr-folders-cell fr-folders-cell--status" role="columnheader">
                {translate("columnStatus")}
              </div>
              <div className="fr-folders-cell fr-folders-cell--type" role="columnheader">
                {translate("columnType")}
              </div>
              <div className="fr-folders-cell fr-folders-cell--updated" role="columnheader">
                {translate("columnUpdated")}
              </div>
              <div
                aria-label={translate("columnActions")}
                className="fr-folders-cell fr-folders-cell--menu"
                role="columnheader"
              />
            </div>
          </div>
        )}
        {isVirtual ? (
          <div className="fr-folders-tree__scroll" ref={scrollRef} role="rowgroup">
            <div
              className="fr-folders-tree__rows"
              role="presentation"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((item) => {
                const entry = entries[item.index];

                return entry === undefined ? null : (
                  <div
                    className="fr-folders-tree__slot"
                    data-index={item.index}
                    key={item.key}
                    ref={virtualizer.measureElement}
                    role="presentation"
                    style={{ transform: `translateY(${item.start}px)` }}
                  >
                    {renderEntry(entry, item.index)}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div role="rowgroup">{entries.map(renderEntry)}</div>
        )}
      </div>
      <div
        aria-live="polite"
        className="fr-folders-visually-hidden"
        data-testid="live-region"
        role="status"
      >
        <span key={keyboard.liveMessage.nonce}>{keyboard.liveMessage.text}</span>
      </div>
    </>
  );
};
