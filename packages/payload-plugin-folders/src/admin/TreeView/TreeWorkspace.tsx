import { useCallback, useMemo } from "react";

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
import { EmptyPanel } from "../Tree/EmptyStates.js";
import type { EmptyCreateActions } from "../Tree/EmptyStates.js";
import { Tree } from "../Tree/Tree.js";
import { useTreeData } from "../Tree/useTreeData.js";
import { useApiContext } from "../useApiContext.js";
import { useSelection } from "../useSelection.js";
import type { TreeItem } from "../../types.js";
import { Breadcrumbs } from "./Breadcrumbs.js";
import type { CrumbMoveMode } from "./Breadcrumbs.js";
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
  onZoom,
  pageFields,
  pageSize,
  reservedRootSegments,
  store,
  title,
  translate,
  typeLabels,
}: TreeWorkspaceProps) => {
  const { rows, state } = useTreeData(store);
  const { zoom } = state;
  // The zoomed folder's row: the breadcrumbs carry it when no parent loaded it.
  const zoomFolder = zoom === null ? null : findLoadedFolder(state, zoom.folderId);
  const viewRootKey = viewRootKeyOf(state);
  const loadedItems = useMemo(
    () => rows.flatMap((row): TreeItem[] => (row.type === "item" ? [row.item] : [])),
    [rows]
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

  const apiContext = useApiContext(store);
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
    rows,
    selection,
    state,
    store,
    translate,
    typeLabels,
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
  const showEmptyPanel = isViewEmpty && isCreateReady && !moveMode.active;
  const showZoomNotFound = zoom?.error === "not-found";
  const topLevelTitle = title;

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
        disabled={isMoveBusy || moveMode.active}
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
