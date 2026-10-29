import { Button, ShimmerEffect } from "@payloadcms/ui";
import { useCallback } from "react";

import type { Translate } from "../compat.js";
import type { FolderKey, TreeStore } from "../store.js";
import { TreeRow } from "./TreeRow.js";
import { useTreeData } from "./useTreeData.js";
import type { LoadMoreRowModel, ErrorRowModel } from "./useTreeData.js";
import { indentPerLevel } from "./TreeRow.js";

export type TreeProps = {
  adminRoute: string;
  language: string;
  onOpenFolder?: (folderId: number | string) => void;
  onOpenPage: (url: string) => void;
  /** Rows per request, shown in the "Load more" label. */
  pageSize: number;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

const levelPadding = (level: number): string =>
  `calc(var(--spacer-2-5) + ${level * indentPerLevel}px)`;

const LoadingRow = ({ level, label }: { label: string; level: number }) => (
  <div
    aria-busy="true"
    aria-label={label}
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
  onRetry,
  row,
  translate,
}: {
  onRetry: (parentKey: FolderKey) => void;
  row: ErrorRowModel;
  translate: Translate;
}) => (
  <div className="fr-folders-row fr-folders-row--status" data-testid="error-row" role="row">
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

const LoadMoreRow = ({
  onLoadMore,
  pageSize,
  row,
  translate,
}: {
  onLoadMore: (parentKey: FolderKey) => void;
  pageSize: number;
  row: LoadMoreRowModel;
  translate: Translate;
}) => (
  <div className="fr-folders-row fr-folders-row--status" data-testid="load-more-row" role="row">
    <div
      className="fr-folders-cell fr-folders-cell--wide"
      role="gridcell"
      style={{ paddingInlineStart: levelPadding(row.level) }}
    >
      <Button
        buttonStyle="secondary"
        disabled={row.loading}
        onClick={() => onLoadMore(row.parentKey)}
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

/** The tree-grid of spec section 7.2: header row, then one row per visible folder and page. */
export const Tree = ({
  adminRoute,
  language,
  onOpenFolder,
  onOpenPage,
  pageSize,
  store,
  translate,
  typeLabels,
}: TreeProps) => {
  const { rows } = useTreeData(store);

  const toggleFolder = useCallback(
    (folderId: number | string) => {
      void store.toggleExpanded(folderId);
    },
    [store]
  );
  const loadMore = useCallback(
    (parentKey: FolderKey) => {
      void store.loadMore(parentKey === "root" ? null : parentKey);
    },
    [store]
  );
  const retry = useCallback(
    (parentKey: FolderKey) => {
      void store.loadChildren(parentKey === "root" ? null : parentKey);
    },
    [store]
  );

  return (
    <div
      aria-colcount={4}
      aria-label={translate("treeLabel")}
      aria-rowcount={rows.length + 1}
      className="fr-folders-tree"
      data-testid="tree"
      role="treegrid"
    >
      <div role="rowgroup">
        <div className="fr-folders-row fr-folders-row--header" role="row">
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
        </div>
      </div>
      <div role="rowgroup">
        {rows.map((row) => {
          switch (row.type) {
            case "item": {
              return (
                <TreeRow
                  adminRoute={adminRoute}
                  key={row.key}
                  language={language}
                  onOpenFolder={onOpenFolder}
                  onOpenPage={onOpenPage}
                  onToggleFolder={toggleFolder}
                  row={row}
                  translate={translate}
                  typeLabels={typeLabels}
                />
              );
            }
            case "loading": {
              return <LoadingRow key={row.key} label={translate("loading")} level={row.level} />;
            }
            case "error": {
              return <ErrorRow key={row.key} onRetry={retry} row={row} translate={translate} />;
            }
            case "load-more": {
              return (
                <LoadMoreRow
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
        })}
      </div>
    </div>
  );
};
