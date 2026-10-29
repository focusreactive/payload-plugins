import { ChevronIcon, DocumentIcon, FolderIcon, Tooltip } from "@payloadcms/ui";
import { useState } from "react";
import type { MouseEvent } from "react";

import type { TreeStatus } from "../../types.js";
import { editViewUrl } from "../compat.js";
import type { Translate } from "../compat.js";
import { HouseIcon } from "./icons.js";
import { formatAbsoluteTime, formatRelativeTime } from "./relativeTime.js";
import { pathDisplayOf } from "./rowDisplay.js";
import type { ItemRowModel } from "./useTreeData.js";

/** Pixels of indent per level of the tree (spec section 7.2). */
export const indentPerLevel = 16;

export type TreeRowProps = {
  adminRoute: string;
  language: string;
  /** Opens a page's edit view in this tab. */
  onOpenPage: (url: string) => void;
  /** Double click on a folder; zooming is wired by the view that supports it. */
  onOpenFolder?: (folderId: number | string) => void;
  onToggleFolder: (folderId: number | string) => void;
  row: ItemRowModel;
  translate: Translate;
  /** Page collection slug to the label of the Type column. */
  typeLabels: Readonly<Record<string, string>>;
};

const statusLabelKeys = {
  changed: "statusChanged",
  draft: "statusDraft",
  live: "statusLive",
  published: "statusPublished",
} as const satisfies Record<TreeStatus, string>;

const opensInNewContext = (event: MouseEvent): boolean =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const RootPageBadge = ({ hint, label }: { hint: string; label: string }) => {
  const [showHint, setShowHint] = useState(false);

  return (
    <span
      aria-label={label}
      className="fr-folders-root-page"
      data-testid="root-page-icon"
      onBlur={() => setShowHint(false)}
      onFocus={() => setShowHint(true)}
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
      role="img"
    >
      <HouseIcon />
      <Tooltip position="top" show={showHint}>
        {hint}
      </Tooltip>
    </span>
  );
};

export const TreeRow = ({
  adminRoute,
  language,
  onOpenFolder,
  onOpenPage,
  onToggleFolder,
  row,
  translate,
  typeLabels,
}: TreeRowProps) => {
  const { expandable, expanded, item, level } = row;
  const isFolder = item.kind === "folder";
  const pageUrl = isFolder ? null : editViewUrl(adminRoute, item.collection, item.id);
  const pathDisplay = pathDisplayOf(item);

  const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
    // Links and buttons inside the row answer for themselves.
    if (event.target instanceof Element && event.target.closest("a, button") !== null) {
      return;
    }
    if (pageUrl !== null) {
      if (opensInNewContext(event)) {
        window.open(pageUrl, "_blank", "noopener");
      } else {
        onOpenPage(pageUrl);
      }

      return;
    }
    // The second click of a double click zooms (when the view supports it) instead of closing
    // the folder the first click just opened.
    if (expandable && event.detail < 2) {
      onToggleFolder(item.id);
    }
  };

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (opensInNewContext(event) || pageUrl === null) {
      return;
    }
    event.preventDefault();
    onOpenPage(pageUrl);
  };

  const typeLabel = (() => {
    if (!isFolder) {
      return typeLabels[item.collection] ?? item.collection;
    }
    const restrictedTo = (item.allowedTypes ?? []).map((slug) => typeLabels[slug] ?? slug);

    return restrictedTo.length > 0
      ? translate("folderOnlyTypes", { types: restrictedTo.join(", ") })
      : translate("folder");
  })();

  return (
    <div
      aria-expanded={isFolder && expandable ? expanded : undefined}
      aria-level={level + 1}
      className="fr-folders-row"
      data-collection={item.collection}
      data-item-id={String(item.id)}
      data-kind={item.kind}
      data-testid="tree-row"
      data-title={item.title}
      onClick={handleRowClick}
      onDoubleClick={() => {
        if (isFolder) {
          onOpenFolder?.(item.id);
        }
      }}
      role="row"
    >
      <div
        className="fr-folders-cell fr-folders-cell--name"
        role="gridcell"
        style={{ paddingInlineStart: `calc(var(--spacer-2-5) + ${level * indentPerLevel}px)` }}
      >
        {isFolder && expandable ? (
          <button
            aria-expanded={expanded}
            aria-label={translate(expanded ? "collapse" : "expand", { name: item.title })}
            className="fr-folders-chevron"
            data-testid="expand-toggle"
            onClick={() => onToggleFolder(item.id)}
            type="button"
          >
            <ChevronIcon direction={expanded ? "down" : "right"} size={16} />
          </button>
        ) : (
          <span aria-hidden="true" className="fr-folders-chevron fr-folders-chevron--empty" />
        )}
        <span aria-hidden="true" className="fr-folders-kind-icon">
          {isFolder ? <FolderIcon size={16} /> : <DocumentIcon size={16} />}
        </span>
        <div className="fr-folders-name-block">
          <div className="fr-folders-name-line">
            {pageUrl === null ? (
              <span className="fr-folders-name" data-testid="row-name">
                {item.title}
              </span>
            ) : (
              <a
                className="fr-folders-name fr-folders-name--link"
                data-testid="row-name"
                href={pageUrl}
                onClick={handleLinkClick}
              >
                {item.title}
              </a>
            )}
            {item.isFolderRoot ? (
              <RootPageBadge hint={translate("rootPageHint")} label={translate("rootPage")} />
            ) : null}
            {isFolder && item.hasRootPage === false ? (
              <span
                className="fr-folders-chip"
                data-testid="no-page-chip"
                title={translate("noPageHint")}
              >
                {translate("noPage")}
              </span>
            ) : null}
            {isFolder && item.childCount !== undefined ? (
              <span className="fr-folders-count">
                <span aria-hidden="true" data-testid="child-count">
                  {item.childCount}
                </span>
                <span className="fr-folders-visually-hidden">
                  {translate("childCount", { count: item.childCount })}
                </span>
              </span>
            ) : null}
          </div>
          <div className="fr-folders-path-line" data-testid="row-path">
            {pathDisplay === "path" ? (
              <>
                <span className="fr-folders-path">{item.fullPath}</span>
                {item.slugIsFallback ? (
                  <span
                    className="fr-folders-chip fr-folders-chip--small"
                    data-testid="fallback-chip"
                    title={translate("fallbackHint")}
                  >
                    {translate("fallback")}
                  </span>
                ) : null}
              </>
            ) : null}
            {pathDisplay === "missing" ? (
              <span className="fr-folders-path fr-folders-path--missing">{translate("noUrl")}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="fr-folders-cell fr-folders-cell--status" role="gridcell">
        {item.status === undefined ? null : (
          <span
            aria-label={translate(statusLabelKeys[item.status])}
            className={`fr-folders-dot fr-folders-dot--${item.status}`}
            data-status={item.status}
            data-testid="status-dot"
            role="img"
            title={translate(statusLabelKeys[item.status])}
          />
        )}
      </div>
      <div className="fr-folders-cell fr-folders-cell--type" role="gridcell">
        <span className="fr-folders-truncate">{typeLabel}</span>
      </div>
      <div className="fr-folders-cell fr-folders-cell--updated" role="gridcell">
        <time
          className="fr-folders-truncate"
          dateTime={item.updatedAt}
          title={formatAbsoluteTime(item.updatedAt, language)}
        >
          {formatRelativeTime(item.updatedAt, language)}
        </time>
      </div>
    </div>
  );
};
