import { useCallback, useMemo } from "react";

import type { ConfirmMoves } from "../../types.js";
import { ListHeader, useLocaleCount } from "../compat.js";
import type { Translate } from "../compat.js";
import { buildCreateMenu, createPageEntryPrefix } from "../Create/createMenu.js";
import { CreateMenuButton } from "../Create/CreateMenuButton.js";
import { pageTypeOptionsOf } from "../Create/pageTypes.js";
import { useCreateFlow } from "../Create/useCreateFlow.js";
import { useContextMenu } from "../ContextMenu/useContextMenu.js";
import type { ContextMenuActions } from "../ContextMenu/useContextMenu.js";
import { useRootPageFlow } from "../ContextMenu/useRootPageFlow.js";
import { DragAndDropProvider } from "../DragAndDrop/DragAndDropProvider.js";
import type { DropRules } from "../DragAndDrop/dropTargets.js";
import type { MoveTarget } from "../Move/moveFlow.js";
import { MoveModeBar } from "../MoveMode/MoveModeBar.js";
import { placeMarkers } from "../MoveMode/moveMarkers.js";
import type { MoveMarker } from "../MoveMode/moveMarkers.js";
import { useMoveMode } from "../MoveMode/useMoveMode.js";
import { useMoveFlow } from "../Move/useMoveFlow.js";
import type { PageFieldNames } from "../Settings/PageSettingsDrawer.js";
import { useSettingsFlow } from "../Settings/useSettingsFlow.js";
import { findLoadedFolder, itemKeyOf } from "../store.js";
import type { TreeStore } from "../store.js";
import { BulkToolbar } from "../Toolbar/BulkToolbar.js";
import type { ToolbarAction } from "../Toolbar/toolbarActions.js";
import { Tree } from "../Tree/Tree.js";
import { useTreeData } from "../Tree/useTreeData.js";
import { useApiContext } from "../useApiContext.js";
import { useSelection } from "../useSelection.js";
import type { TreeItem } from "../../types.js";

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
  pageFields,
  pageSize,
  reservedRootSegments,
  store,
  title,
  translate,
  typeLabels,
}: TreeWorkspaceProps) => {
  const { rows, state } = useTreeData(store);
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
  const pickMarker = useCallback(
    (marker: MoveMarker) => {
      void startDropMove({
        items: moveMode.moving,
        onMoved: exitMoveMode,
        selection: moveMode.movesSelection ? selection.items : null,
        target: marker.target,
        targetTitle: marker.targetFolder?.title ?? translate("moveToRoot"),
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

  const apiContext = useApiContext(store);
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
    state,
    store,
    translate,
    typeLabels,
  });
  const { startFolder, startPage } = createFlow;
  // The header creates at the top level until zooming (P-35) gives it a folder to create in.
  const createMenuGroups = useMemo(
    () => buildCreateMenu(pageTypeOptionsOf(null, typeLabels)),
    [typeLabels]
  );
  const selectCreateEntry = useCallback(
    (entryId: string) => {
      if (entryId === "createFolder") {
        startFolder(null);
      } else if (entryId.startsWith(createPageEntryPrefix)) {
        startPage(null, entryId.slice(createPageEntryPrefix.length));
      }
    },
    [startFolder, startPage]
  );

  const menuActions = useMemo<ContextMenuActions>(
    () => ({
      createFolder: startFolder,
      createPage: startPage,
      moveMode: startMoveMode,
      moveTo: startMoveTo,
      moveWithinFolder,
      openPage: onOpenPage,
      setAsRoot: startSetAsRoot,
      settings: startSettings,
      unsetRoot: startUnroot,
    }),
    [
      moveWithinFolder,
      onOpenPage,
      startFolder,
      startMoveMode,
      startMoveTo,
      startPage,
      startSetAsRoot,
      startSettings,
      startUnroot,
    ]
  );
  const contextMenu = useContextMenu({
    actions: menuActions,
    adminRoute,
    apiContext,
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
      // Duplicate, Publish, Unpublish and Delete open their dialogs in a later ticket (spec
      // section 7.10); until then pressing one does nothing.
    },
    [enterMoveMode, selection.items, startMoveTo, startSettings]
  );

  return (
    <>
      {moveMode.active ? (
        <MoveModeBar count={moveMode.moving.length} onCancel={exitMoveMode} translate={translate} />
      ) : null}
      {selection.items.length > 0 && !moveMode.active ? (
        <BulkToolbar
          busy={isMoveBusy}
          items={selection.items}
          onAction={runAction}
          onCancel={clear}
          translate={translate}
        />
      ) : null}
      {selection.items.length === 0 && !moveMode.active ? (
        <ListHeader
          Actions={[
            <CreateMenuButton
              groups={createMenuGroups}
              key="create"
              onSelect={selectCreateEntry}
              translate={translate}
            />,
          ]}
          title={title}
        />
      ) : null}
      <div className="fr-folders-body">
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
          <Tree
            adminRoute={adminRoute}
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
        </DragAndDropProvider>
      </div>
      {moveFlow.dialogs}
      {rootPageFlow.dialog}
      {settingsFlow.dialogs}
      {createFlow.dialogs}
      {contextMenu.menu}
    </>
  );
};
