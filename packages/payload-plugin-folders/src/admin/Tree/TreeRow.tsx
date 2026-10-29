import { CheckboxInput, ChevronIcon, DocumentIcon, FolderIcon, Tooltip } from "@payloadcms/ui";
import { useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";

import type { TreeItem, TreeStatus } from "../../types.js";
import { editViewUrl } from "../compat.js";
import type { Translate } from "../compat.js";
import { useRowDrag } from "../DragAndDrop/dragState.js";
import { HouseIcon } from "./icons.js";
import { formatAbsoluteTime, formatRelativeTime } from "./relativeTime.js";
import { pathDisplayOf } from "./rowDisplay.js";
import type { ItemRowModel } from "./useTreeData.js";

/** Pixels of indent per level of the tree (spec section 7.2). */
export const indentPerLevel = 16;

export type TreeRowProps = {
  adminRoute: string;
  isSelected: boolean;
  language: string;
  /** Opens a page's edit view in this tab. */
  onOpenPage: (url: string) => void;
  /** Double click on a folder; zooming is wired by the view that supports it. */
  onOpenFolder?: (folderId: number | string) => void;
  /** Shift click or Shift on the checkbox: ticks from the last ticked row to this one. */
  onSelectRange: (item: TreeItem) => void;
  onToggleFolder: (folderId: number | string) => void;
  /** The checkbox, or Cmd/Ctrl click on the row. */
  onToggleSelect: (item: TreeItem) => void;
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

/** Alt click or a non-primary button opens a page in a new tab; Shift and Cmd/Ctrl click select. */
const opensInNewContext = (event: MouseEvent): boolean => event.button !== 0 || event.altKey;

/** What a click inside the row answers for itself, so the row's own click rules stay out of it. */
const rowIgnoreSelector = "a, button, input, label, [data-row-ignore]";

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
  isSelected,
  language,
  onOpenFolder,
  onOpenPage,
  onSelectRange,
  onToggleFolder,
  onToggleSelect,
  row,
  translate,
  typeLabels,
}: TreeRowProps) => {
  const { expandable, expanded, item, level } = row;
  const isFolder = item.kind === "folder";
  const pageUrl = isFolder ? null : editViewUrl(adminRoute, item.collection, item.id);
  const pathDisplay = pathDisplayOf(item);
  const drag = useRowDrag(item, row.key);

  const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
    // Links and buttons inside the row answer for themselves.
    if (event.target instanceof Element && event.target.closest(rowIgnoreSelector) !== null) {
      return;
    }
    if (event.shiftKey) {
      onSelectRange(item);

      return;
    }
    if (event.metaKey || event.ctrlKey) {
      onToggleSelect(item);

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
    // Shift selects a range instead of opening a window; Cmd or Ctrl click on the name keeps the
    // browser's own new tab.
    if (event.shiftKey) {
      event.preventDefault();
      onSelectRange(item);

      return;
    }
    if (opensInNewContext(event) || event.metaKey || event.ctrlKey || pageUrl === null) {
      return;
    }
    event.preventDefault();
    onOpenPage(pageUrl);
  };

  const handleCheckboxToggle = (event: ChangeEvent<HTMLInputElement>) => {
    // The change event of a checkbox is a click, which knows whether Shift was held.
    const { nativeEvent } = event;
    if ("shiftKey" in nativeEvent && nativeEvent.shiftKey === true) {
      onSelectRange(item);
    } else {
      onToggleSelect(item);
    }
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
      aria-selected={isSelected}
      className={[
        "fr-folders-row",
        isSelected ? "fr-folders-row--selected" : "",
        drag.isDragged ? "fr-folders-row--dragged" : "",
        drag.indicator?.edge === "inside" ? "fr-folders-row--drop-inside" : "",
        drag.indicator?.edge === "inside" && drag.indicator.isRefused
          ? "fr-folders-row--drop-refused"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-collection={item.collection}
      data-dragged={drag.isDragged ? "true" : undefined}
      data-drop={drag.indicator?.edge}
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
      // Shift click selects a range: stop the browser from selecting the text in between.
      onMouseDown={(event) => {
        if (event.shiftKey) {
          event.preventDefault();
        }
      }}
      ref={drag.setRowRef}
      role="row"
      {...drag.listeners}
    >
      {drag.indicator && drag.indicator.edge !== "inside" ? (
        <span
          aria-hidden="true"
          className={`fr-folders-drop-line fr-folders-drop-line--${drag.indicator.edge}${
            drag.indicator.isRefused ? " fr-folders-drop-line--refused" : ""
          }`}
          data-edge={drag.indicator.edge}
          data-level={drag.indicator.level}
          data-testid="drop-indicator"
          style={{
            insetInlineStart: `calc(var(--fr-folders-select-width) + var(--spacer-2-5) + ${
              drag.indicator.level * indentPerLevel
            }px)`,
          }}
        />
      ) : null}
      <div className="fr-folders-cell fr-folders-cell--select" data-row-ignore role="gridcell">
        <CheckboxInput
          aria-label={translate("selectRow", { name: item.title })}
          checked={isSelected}
          onToggle={handleCheckboxToggle}
        />
      </div>
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
                // A link drags as a URL by itself, which would end the row's own drag.
                draggable={false}
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
