import { useMemo } from "react";

import { ListHeader } from "../compat.js";
import type { Translate } from "../compat.js";
import type { TreeStore } from "../store.js";
import { BulkToolbar } from "../Toolbar/BulkToolbar.js";
import { Tree } from "../Tree/Tree.js";
import { useTreeData } from "../Tree/useTreeData.js";
import { useSelection } from "../useSelection.js";
import type { TreeItem } from "../../types.js";

export type TreeWorkspaceProps = {
  adminRoute: string;
  language: string;
  onOpenPage: (url: string) => void;
  pageSize: number;
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
  language,
  onOpenPage,
  pageSize,
  store,
  title,
  translate,
  typeLabels,
}: TreeWorkspaceProps) => {
  const { rows } = useTreeData(store);
  const loadedItems = useMemo(
    () => rows.flatMap((row): TreeItem[] => (row.type === "item" ? [row.item] : [])),
    [rows]
  );
  const selection = useSelection(loadedItems);
  const { clear } = selection;

  // Every button but Cancel opens its own dialog or mode in a later ticket (spec sections 7.4,
  // 7.8, 7.9 and 7.10); until then pressing one does nothing.
  const doNothingYet = () => undefined;

  return (
    <>
      {selection.items.length > 0 ? (
        <BulkToolbar
          items={selection.items}
          onAction={doNothingYet}
          onCancel={clear}
          translate={translate}
        />
      ) : (
        <ListHeader title={title} />
      )}
      <div className="fr-folders-body">
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
      </div>
    </>
  );
};
