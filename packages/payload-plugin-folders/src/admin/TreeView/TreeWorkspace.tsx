import { useCallback, useEffect, useMemo, useState } from "react";

import type { ConfirmMoves, FolderId } from "../../types.js";
import { ListHeader, useCanCreate, useLocaleCount } from "../compat.js";
import type { Translate } from "../compat.js";
import { buildCreateMenu, createPageEntryPrefix } from "../Create/createMenu.js";
import { CreateMenuButton } from "../Create/CreateMenuButton.js";
import { pageTypeOptionsOf } from "../Create/pageTypes.js";
import { useCreateFlow } from "../Create/useCreateFlow.js";
import { useContextMenu } from "../ContextMenu/useContextMenu.js";
import type { ContextMenuActions } from "../ContextMenu/useContextMenu.js";
import { useRootPageFlow } from "../ContextMenu/useRootPageFlow.js";
import { DragAndDropProvider } from "../DragAndDrop/DragAndDropProvider.js";
import { focusRowWhenShown } from "../Keyboard/focusRow.js";
import { useTreeKeyboard } from "../Keyboard/useTreeKeyboard.js";
import { resolveCrumbDrop } from "../DragAndDrop/dropTargets.js";
import type { DropRules } from "../DragAndDrop/dropTargets.js";
import type { MoveTarget } from "../Move/moveFlow.js";
import { useOperationsFlow } from "../Operations/useOperationsFlow.js";
import { MoveModeBar } from "../MoveMode/MoveModeBar.js";
import { markerReasonOf, placeMarkers } from "../MoveMode/moveMarkers.js";
import type { MoveMarker } from "../MoveMode/moveMarkers.js";
import { useMoveMode } from "../MoveMode/useMoveMode.js";
import { useMoveFlow } from "../Move/useMoveFlow.js";
import type { PageFieldNames } from "../Settings/PageSettingsDrawer.js";
import { useSettingsFlow } from "../Settings/useSettingsFlow.js";
import { findLoadedFolder, itemKeyOf, viewRootKeyOf } from "../store.js";
import type { TreeStore } from "../store.js";
import { BulkToolbar } from "../Toolbar/BulkToolbar.js";
import type { ToolbarAction } from "../Toolbar/toolbarActions.js";
import { DriftBanner } from "../Repair/DriftBanner.js";
import { useRepairFlow } from "../Repair/useRepairFlow.js";
import { useTreeHealth } from "../Repair/useTreeHealth.js";
import { HeaderMenuButton } from "../Menu/HeaderMenuButton.js";
import type { MenuGroups } from "../Menu/menuEntries.js";
import { SearchBox } from "../Search/SearchBox.js";
import { foldersToOpenFor, noFilters, searchRowsOf } from "../Search/searchLogic.js";
import type { SearchFilters } from "../Search/searchLogic.js";
import { SearchEmpty, SearchError, SearchSummary } from "../Search/SearchStatus.js";
import { useSearch } from "../Search/useSearch.js";
import { EmptyPanel } from "../Tree/EmptyStates.js";
import type { EmptyCreateActions } from "../Tree/EmptyStates.js";
import { Tree } from "../Tree/Tree.js";
import { useTreeData } from "../Tree/useTreeData.js";
import { useApiContext } from "../useApiContext.js";
import { useSelection } from "../useSelection.js";
import type { TreeItem } from "../../types.js";
import type { TreeRowModel } from "../Tree/useTreeData.js";
import { Breadcrumbs } from "./Breadcrumbs.js";
import type { CrumbMoveMode } from "./Breadcrumbs.js";
import type { SearchScope } from "./treeUrlState.js";
import { ZoomNotFound } from "./ZoomNotFound.js";

export type TreeWorkspaceProps = {
  adminRoute: string;
  confirmMoves: ConfirmMoves;
  /** Page collections with drafts: a page of one is created as a draft. */
  draftCollections: readonly string[];
  enforceAllowedTypesOnMove: boolean;
  foldersSlug: string;
  /** The host set `admin.previewUrl`: the context menu offers "View page". */
  hasPreviewUrl: boolean;
  language: string;
  /** The deepest a URL may go. */
  maxDepth: number;
  /** Zooms into a folder, or back to the top level with `null`: the address changes, then the store. */
  onZoom: (folderId: FolderId | null) => void;
  onOpenPage: (url: string) => void;
  /** Page collection slug to the names of its title and segment fields. */
  pageFields: Record<string, PageFieldNames>;
  pageSize: number;
  /** Segments the top level cannot take. */
  reservedRootSegments: readonly string[];
  /** `?q=`: the search text; an empty one is the tree. */
  searchQuery: string;
  /** `?scope=all`: search everywhere, not only the zoomed folder. */
  searchScope: SearchScope;
  /** Writes `?q=` and `?scope=` into the address. */
  onSearchChange: (changes: { query?: string; scope?: SearchScope }) => void;
  store: TreeStore;
  title: string;
  translate: Translate;
  typeLabels: Record<string, string>;
};

/**
 * The header, the selection toolbar that takes its place, and the tree under them. The store must
 * be configured before this mounts. It owns the selection because the toolbar and the rows both
 * read it.
 */
export const TreeWorkspace = ({
  adminRoute,
  confirmMoves,
  draftCollections,
  enforceAllowedTypesOnMove,
  foldersSlug,
  hasPreviewUrl,
  language,
  maxDepth,
  onOpenPage,
  onSearchChange,
  onZoom,
  pageFields,
  pageSize,
  reservedRootSegments,
  searchQuery,
  searchScope,
  store,
  title,
  translate,
  typeLabels,
}: TreeWorkspaceProps) => {
  const { rows, state } = useTreeData(store);
  const { zoom } = state;
  const apiContext = useApiContext(store);
  // The zoomed folder's row: the breadcrumbs carry it when no parent loaded it.
  const zoomFolder = zoom === null ? null : findLoadedFolder(state, zoom.folderId);
  const viewRootKey = viewRootKeyOf(state);

  // A search replaces the tree with its hits; the filters belong to one search.
  const isSearching = searchQuery.trim() !== "";
  const [filters, setFilters] = useState<SearchFilters>(noFilters);
  useEffect(() => {
    if (!isSearching) {
      setFilters(noFilters);
    }
  }, [isSearching]);
  const search = useSearch({
    apiContext,
    enabled: isSearching,
    filters,
    folderId: zoom?.folderId ?? null,
    locale: store.getOptions()?.locale ?? null,
    query: searchQuery,
    revision: state.revision,
    scope: searchScope,
  });
  const resultRows = useMemo(
    () => searchRowsOf(search.items, search.folders, title),
    [search.folders, search.items, title]
  );
  const selectableRows: readonly TreeRowModel[] = isSearching ? resultRows : rows;
  const loadedItems = useMemo(
    () => selectableRows.flatMap((row): TreeItem[] => (row.type === "item" ? [row.item] : [])),
    [selectableRows]
  );
  const selection = useSelection(loadedItems);
  const { clear, select } = selection;
  const languageCount = useLocaleCount();

  const moveFlow = useMoveFlow({
    confirmMoves,
    enforceAllowedTypesOnMove,
    foldersSlug,
    languageCount,
    onMoved: clear,
    onMoveFailed: select,
    store,
    translate,
    typeLabels,
  });
  const { startDropMove, startMoveTo } = moveFlow;
  const dropRules = useMemo<DropRules>(
    () => ({
      enforceAllowedTypes: enforceAllowedTypesOnMove,
      maxDepth,
      reservedRootSegments,
      typeLabels,
    }),
    [enforceAllowedTypesOnMove, maxDepth, reservedRootSegments, typeLabels]
  );

  const isMoveBusy = moveFlow.isMoving || moveFlow.isPreviewing;
  const moveMode = useMoveMode({ isBusy: isMoveBusy, selectedItems: selection.items, state });
  const { enter: enterMoveMode, exit: exitMoveMode } = moveMode;
  const placedRows = useMemo(
    () =>
      moveMode.active
        ? placeMarkers(rows, { moving: moveMode.moving, rules: dropRules, state })
        : null,
    [dropRules, moveMode.active, moveMode.moving, rows, state]
  );
  // The hits, while a search is on. Move mode shows the tree instead, because a place to put rows
  // is a place in the tree; the hits come back when it ends.
  const showSearchView = isSearching && !moveMode.active;
  const displayRows: readonly TreeRowModel[] = showSearchView ? resultRows : rows;
  const startMoveMode = useCallback(
    (items: readonly TreeItem[]) => {
      // Moving exactly the ticked rows is the selection's move: a refusal puts the ticks back.
      const tickedKeys = new Set(selection.items.map(itemKeyOf));
      const isSelection =
        items.length === tickedKeys.size && items.every((item) => tickedKeys.has(itemKeyOf(item)));
      enterMoveMode(items, isSelection);
    },
    [enterMoveMode, selection.items]
  );
  // A marker in the tree and a crumb above it are the same move: the same plan and confirm.
  const pickTarget = useCallback(
    (target: MoveTarget, targetFolder: TreeItem | null) => {
      void startDropMove({
        items: moveMode.moving,
        onMoved: exitMoveMode,
        selection: moveMode.movesSelection ? selection.items : null,
        target,
        targetTitle:
          targetFolder?.title ?? translate(target.toFolder === null ? "moveToRoot" : "folder"),
      });
    },
    [
      exitMoveMode,
      moveMode.movesSelection,
      moveMode.moving,
      selection.items,
      startDropMove,
      translate,
    ]
  );
  const pickMarker = useCallback(
    (marker: MoveMarker) => pickTarget(marker.target, marker.targetFolder),
    [pickTarget]
  );
  const crumbMoveMode = useMemo<CrumbMoveMode | undefined>(() => {
    if (!moveMode.active) {
      return undefined;
    }
    const count = moveMode.moving.length;
    const resolve = (folder: TreeItem | null) =>
      resolveCrumbDrop({ dragged: moveMode.moving, folder, rules: dropRules, state });
    const reasonOf = (folder: TreeItem | null): string | null =>
      markerReasonOf(resolve(folder), { count, isBusy: isMoveBusy, translate });

    return {
      count,
      onPick: (folder) => {
        if (reasonOf(folder) === null) {
          const { target, targetFolder } = resolve(folder);
          pickTarget(target, targetFolder);
        }
      },
      reasonOf,
    };
  }, [dropRules, isMoveBusy, moveMode.active, moveMode.moving, pickTarget, state, translate]);

  const canCreate = useCanCreate();
  const operationsFlow = useOperationsFlow({
    apiContext,
    foldersSlug,
    languageCount,
    locale: store.getOptions()?.locale ?? null,
    onSettled: clear,
    store,
    translate,
    typeLabels,
  });
  const { startDelete, startDuplicate, startPublish } = operationsFlow;
  const health = useTreeHealth({ apiContext, revision: state.revision });
  const repairFlow = useRepairFlow({
    apiContext,
    onRepaired: health.refresh,
    store,
    translate,
  });
  const { start: startRepair } = repairFlow;
  const rootPageFlow = useRootPageFlow({ apiContext, languageCount, state, store, translate });
  const { start: startSetAsRoot } = rootPageFlow;
  const settingsFlow = useSettingsFlow({
    adminRoute,
    apiContext,
    confirmMoves,
    draftCollections,
    enforceAllowedTypes: enforceAllowedTypesOnMove,
    foldersSlug,
    language,
    languageCount,
    locale: store.getOptions()?.locale ?? null,
    onMove: startDropMove,
    pageFields,
    state,
    store,
    translate,
    typeLabels,
  });
  const { startSettings, startUnroot } = settingsFlow;

  // Move up and Move down are single-row moves through the same plan, confirm and Undo as a drop.
  const moveWithinFolder = useCallback(
    (item: TreeItem, target: MoveTarget) => {
      const folder = findLoadedFolder(state, item.parentId);
      void startDropMove({
        items: [item],
        selection: null,
        target,
        targetTitle: folder?.title ?? translate("moveToRoot"),
      });
    },
    [startDropMove, state, translate]
  );

  const createFlow = useCreateFlow({
    adminRoute,
    apiContext,
    draftCollections,
    foldersSlug,
    onOpenPage,
    pageFields,
    state,
    store,
    translate,
    typeLabels,
  });
  const { startFolder, startPage } = createFlow;
  // The header creates in the zoomed folder, or at the top level when there is no zoom. Until the
  // zoomed folder's row is known its allowed types are not, so the button waits for it.
  const createMenuGroups = useMemo(
    () => buildCreateMenu(pageTypeOptionsOf(zoomFolder, typeLabels)),
    [typeLabels, zoomFolder]
  );
  const isCreateReady = zoom === null || zoomFolder !== null;
  const selectCreateEntry = useCallback(
    (entryId: string) => {
      if (entryId === "createFolder") {
        startFolder(zoomFolder);
      } else if (entryId.startsWith(createPageEntryPrefix)) {
        startPage(zoomFolder, entryId.slice(createPageEntryPrefix.length));
      }
    },
    [startFolder, startPage, zoomFolder]
  );

  // The empty states offer a page of the folder's first type: the default type when it has one.
  const emptyActions = useMemo<EmptyCreateActions>(() => {
    const firstTypeOf = (folder: TreeItem | null): string | null =>
      pageTypeOptionsOf(folder, typeLabels)[0]?.collection ?? null;

    return {
      canCreateFolder: canCreate(foldersSlug),
      canCreatePage: (folder) => {
        const type = firstTypeOf(folder);

        return type !== null && canCreate(type);
      },
      onCreateFolder: startFolder,
      onCreatePage:
        Object.keys(typeLabels).length === 0
          ? null
          : (folder) => {
              const type = firstTypeOf(folder);
              if (type !== null) {
                startPage(folder, type);
              }
            },
    };
  }, [canCreate, foldersSlug, startFolder, startPage, typeLabels]);

  const moreMenuGroups = useMemo<MenuGroups>(
    () =>
      health.canRepair ? [[{ id: "repair", label: { key: "repairTitle" }, reason: null }]] : [],
    [health.canRepair]
  );
  const selectMoreEntry = useCallback(
    (entryId: string) => {
      if (entryId === "repair") {
        startRepair();
      }
    },
    [startRepair]
  );

  const menuActions = useMemo<ContextMenuActions>(
    () => ({
      createFolder: startFolder,
      createPage: startPage,
      delete: startDelete,
      duplicate: startDuplicate,
      moveMode: startMoveMode,
      moveTo: startMoveTo,
      moveWithinFolder,
      openFolder: (folder) => onZoom(folder.id),
      openPage: onOpenPage,
      publish: startPublish,
      setAsRoot: startSetAsRoot,
      settings: startSettings,
      unsetRoot: startUnroot,
    }),
    [
      moveWithinFolder,
      onOpenPage,
      onZoom,
      startDelete,
      startDuplicate,
      startFolder,
      startMoveMode,
      startMoveTo,
      startPage,
      startPublish,
      startSetAsRoot,
      startSettings,
      startUnroot,
    ]
  );
  const contextMenu = useContextMenu({
    actions: menuActions,
    adminRoute,
    apiContext,
    canCreate,
    draftCollections,
    hasPreviewUrl,
    isBusy: isMoveBusy,
    rows: displayRows,
    selection,
    state,
    store,
    translate,
    typeLabels,
  });

  // Escape in a search: the tree is back, the focused hit's folders are open and its row has the focus.
  const leaveSearch = useCallback(
    (focused: TreeItem | null) => {
      onSearchChange({ query: "" });
      if (focused === null) {
        return;
      }
      void (async () => {
        const zoomFolderId = zoom?.folderId ?? null;
        let toOpen = foldersToOpenFor(focused, zoomFolderId);
        // A hit outside the zoomed folder is only on screen from the top level.
        if (toOpen === null) {
          onZoom(null);
          toOpen = foldersToOpenFor(focused, null) ?? [];
        }
        for (const id of toOpen) {
          await store.setExpanded(id, true);
        }
        focusRowWhenShown(focused);
      })();
    },
    [onSearchChange, onZoom, store, zoom?.folderId]
  );
  const keyboard = useTreeKeyboard({
    actions: {
      delete: startDelete,
      duplicate: startDuplicate,
      leaveSearch,
      openFolder: (folder) => onZoom(folder.id),
      openPage: onOpenPage,
      startDropMove,
      undoLastMove: moveFlow.undoLast,
    },
    adminRoute,
    isBusy: isMoveBusy,
    isMoveModeActive: moveMode.active,
    isSearching,
    rows: displayRows,
    rules: dropRules,
    selection,
    state,
    store,
    translate,
  });

  const runAction = useCallback(
    (action: ToolbarAction) => {
      if (action === "moveTo") {
        startMoveTo(selection.items);
      }
      if (action === "move") {
        enterMoveMode(selection.items, true);
      }
      if (action === "settings" && selection.items.length === 1) {
        startSettings(selection.items[0] as TreeItem);
      }
      if (action === "duplicate") {
        startDuplicate(selection.items);
      }
      if (action === "publish" || action === "unpublish") {
        startPublish(selection.items, action);
      }
      if (action === "delete") {
        startDelete(selection.items);
      }
    },
    [
      enterMoveMode,
      selection.items,
      startDelete,
      startDuplicate,
      startMoveTo,
      startPublish,
      startSettings,
    ]
  );

  // The view's own root has nothing in it: a database with no content, or an empty zoomed folder.
  const viewEntry = state.childrenByFolder[viewRootKey];
  const isViewEmpty =
    viewEntry?.phase === "loaded" && viewEntry.items.length === 0 && !viewEntry.hasMore;
  // Move mode needs the tree even when it is empty: the top marker is where rows can be put in.
  const showEmptyPanel = isViewEmpty && isCreateReady && !moveMode.active && !isSearching;
  const showZoomNotFound = zoom?.error === "not-found";
  const topLevelTitle = title;

  const isScopedToFolder = zoom !== null && searchScope === "folder";
  const folderName = zoomFolder?.title ?? topLevelTitle;
  const coverName = isScopedToFolder ? folderName : topLevelTitle;
  const typeOptions = useMemo(
    () => [
      ...Object.entries(typeLabels).map(([value, label]) => ({ label, value })),
      { label: translate("folder"), value: foldersSlug },
    ],
    [foldersSlug, translate, typeLabels]
  );
  const focusTabStopRow = useCallback(() => {
    document.querySelector<HTMLElement>('[data-testid="tree-row"][tabindex="0"]')?.focus();
  }, []);

  const headerActions = [
    <CreateMenuButton
      disabled={!isCreateReady}
      groups={createMenuGroups}
      key="create"
      onSelect={selectCreateEntry}
      translate={translate}
    />,
    ...(moreMenuGroups.length === 0
      ? []
      : [
          <HeaderMenuButton
            groups={moreMenuGroups}
            key="more"
            label={translate("menuMoreActions")}
            onSelect={selectMoreEntry}
            translate={translate}
          />,
        ]),
  ];

  return (
    <>
      {moveMode.active ? (
        <MoveModeBar count={moveMode.moving.length} onCancel={exitMoveMode} translate={translate} />
      ) : null}
      {selection.items.length > 0 && !moveMode.active ? (
        <BulkToolbar
          busy={isMoveBusy}
          canCreate={canCreate}
          items={selection.items}
          onAction={runAction}
          onCancel={clear}
          translate={translate}
        />
      ) : null}
      {selection.items.length === 0 && !moveMode.active ? (
        <ListHeader Actions={headerActions} title={title} />
      ) : null}
      <DragAndDropProvider
        disabled={isMoveBusy || moveMode.active || isSearching}
        onDrop={(drop) => void startDropMove(drop)}
        rows={rows}
        rules={dropRules}
        selectedItems={selection.items}
        state={state}
        store={store}
        translate={translate}
      >
        {zoom === null || showZoomNotFound ? null : (
          <Breadcrumbs
            adminRoute={adminRoute}
            chain={zoom.chain}
            folderId={zoom.folderId}
            foldersSlug={foldersSlug}
            moveMode={crumbMoveMode}
            onZoom={onZoom}
            title={topLevelTitle}
            translate={translate}
          />
        )}
        {moveMode.active ? null : (
          <SearchBox
            coverName={coverName}
            filters={filters}
            folderName={folderName}
            isSearching={isSearching}
            isZoomed={zoom !== null}
            onFiltersChange={setFilters}
            onFocusResults={focusTabStopRow}
            onQueryChange={(query) => onSearchChange({ query })}
            onReturnToTree={focusTabStopRow}
            onScopeChange={(scope) => onSearchChange({ scope })}
            query={searchQuery}
            scope={searchScope}
            translate={translate}
            typeOptions={typeOptions}
          />
        )}
        <div className="fr-folders-banners" data-testid="tree-banners">
          {health.hasDrift ? (
            <DriftBanner
              canRepair={health.canRepair}
              onRebuild={startRepair}
              translate={translate}
            />
          ) : null}
          {operationsFlow.banner}
        </div>
        <div className="fr-folders-body">
          {showZoomNotFound ? (
            <ZoomNotFound onBack={() => onZoom(null)} title={topLevelTitle} translate={translate} />
          ) : showSearchView ? (
            <>
              <SearchSummary
                coverName={coverName}
                count={search.items.length}
                isLoading={!search.isCurrent}
                query={searchQuery}
                translate={translate}
                truncated={search.truncated}
              />
              {search.error !== null ? (
                <SearchError message={search.error} onRetry={search.retry} translate={translate} />
              ) : search.isCurrent && search.items.length === 0 ? (
                <SearchEmpty
                  coverName={coverName}
                  onSearchEverywhere={
                    isScopedToFolder ? () => onSearchChange({ scope: "all" }) : null
                  }
                  query={searchQuery}
                  translate={translate}
                />
              ) : search.items.length > 0 ? (
                <Tree
                  adminRoute={adminRoute}
                  emptyActions={emptyActions}
                  keyboard={keyboard}
                  label={translate("searchResultsLabel")}
                  language={language}
                  onOpenFolder={onZoom}
                  onOpenMenu={contextMenu.openMenu}
                  onOpenPage={onOpenPage}
                  onOpenSettings={startSettings}
                  openMenuItemKey={contextMenu.openItemKey}
                  pageSize={pageSize}
                  rows={resultRows}
                  selection={selection}
                  store={store}
                  translate={translate}
                  typeLabels={typeLabels}
                />
              ) : null}
            </>
          ) : showEmptyPanel ? (
            <EmptyPanel
              actions={emptyActions}
              folder={zoomFolder}
              isZoomed={zoom !== null}
              translate={translate}
            />
          ) : (
            <Tree
              adminRoute={adminRoute}
              emptyActions={emptyActions}
              keyboard={keyboard}
              label={translate("treeLabel")}
              language={language}
              moveMode={
                placedRows === null
                  ? undefined
                  : {
                      count: moveMode.moving.length,
                      isBusy: isMoveBusy,
                      onPick: pickMarker,
                      placed: placedRows,
                    }
              }
              onOpenFolder={onZoom}
              onOpenMenu={contextMenu.openMenu}
              onOpenPage={onOpenPage}
              onOpenSettings={startSettings}
              openMenuItemKey={contextMenu.openItemKey}
              pageSize={pageSize}
              rows={rows}
              selection={selection}
              store={store}
              translate={translate}
              typeLabels={typeLabels}
            />
          )}
        </div>
      </DragAndDropProvider>
      {moveFlow.dialogs}
      {rootPageFlow.dialog}
      {settingsFlow.dialogs}
      {createFlow.dialogs}
      {operationsFlow.dialogs}
      {repairFlow.dialog}
      {contextMenu.menu}
    </>
  );
};
