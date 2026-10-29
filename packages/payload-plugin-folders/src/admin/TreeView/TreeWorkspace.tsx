import { useCallback, useMemo } from "react";

import type { ConfirmMoves } from "../../types.js";
import { ListHeader, useLocaleCount } from "../compat.js";
import type { Translate } from "../compat.js";
import { DragAndDropProvider } from "../DragAndDrop/DragAndDropProvider.js";
import type { DropRules } from "../DragAndDrop/dropTargets.js";
import { useMoveFlow } from "../Move/useMoveFlow.js";
import type { TreeStore } from "../store.js";
import { BulkToolbar } from "../Toolbar/BulkToolbar.js";
import type { ToolbarAction } from "../Toolbar/toolbarActions.js";
import { Tree } from "../Tree/Tree.js";
import { useTreeData } from "../Tree/useTreeData.js";
import { useSelection } from "../useSelection.js";
import type { TreeItem } from "../../types.js";

export type TreeWorkspaceProps = {
  adminRoute: string;
  confirmMoves: ConfirmMoves;
  enforceAllowedTypesOnMove: boolean;
  foldersSlug: string;
  language: string;
  /** The deepest a URL may go. */
  maxDepth: number;
  onOpenPage: (url: string) => void;
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
  enforceAllowedTypesOnMove,
  foldersSlug,
  language,
  maxDepth,
  onOpenPage,
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

  const runAction = useCallback(
    (action: ToolbarAction) => {
      if (action === "moveTo") {
        startMoveTo(selection.items);
      }
      // Move mode, Duplicate, Publish, Unpublish, Delete and Settings open their dialogs in later
      // tickets (spec sections 7.4, 7.8 and 7.10); until then pressing one does nothing.
    },
    [selection.items, startMoveTo]
  );

  return (
    <>
      {selection.items.length > 0 ? (
        <BulkToolbar
          busy={moveFlow.isMoving}
          items={selection.items}
          onAction={runAction}
          onCancel={clear}
          translate={translate}
        />
      ) : (
        <ListHeader title={title} />
      )}
      <div className="fr-folders-body">
        <DragAndDropProvider
          disabled={moveFlow.isMoving}
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
            onOpenPage={onOpenPage}
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
    </>
  );
};
