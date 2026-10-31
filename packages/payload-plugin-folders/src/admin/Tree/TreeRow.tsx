import { CheckboxInput, ChevronIcon, DocumentIcon, FolderIcon, Tooltip } from "@payloadcms/ui";
import { useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";

import type { TreeItem, TreeStatus } from "../../types.js";
import { editViewUrl } from "../compat.js";
import type { Translate } from "../compat.js";
import { useRowDrag } from "../DragAndDrop/dragState.js";
import type { MenuAnchor } from "../Menu/menuEntries.js";
import { HouseIcon, MoreIcon } from "./icons.js";
import { formatAbsoluteTime, formatRelativeTime } from "./relativeTime.js";
import { isTextEntry, opensSettings } from "../Settings/settingsKey.js";
import { pathDisplayOf } from "./rowDisplay.js";
import type { ItemRowModel } from "./useTreeData.js";

/** Pixels of indent per level of the tree (spec section 7.2). */
export const indentPerLevel = 16;

export type TreeRowProps = {
  adminRoute: string;
  /** This row's context menu is open. */
  isMenuOpen: boolean;
  isSelected: boolean;
  language: string;
  /** Opens a page's edit view in this tab. */
  onOpenPage: (url: string) => void;
  /** Double click on a folder; zooming is wired by the view that supports it. */
  onOpenFolder?: (folderId: number | string) => void;
  /**
   * Opens the context menu: from a right click, the row's button, or Shift+F10 and the ContextMenu
   * key. `returnFocus` is where focus goes when the keyboard closes the menu.
   */
  onOpenMenu: (item: TreeItem, anchor: MenuAnchor, returnFocus: HTMLElement | null) => void;
  /** F2 on the row or a control inside it: opens the row's Settings. */
  onOpenSettings: (item: TreeItem) => void;
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
  isMenuOpen,
  isSelected,
  language,
  onOpenFolder,
  onOpenMenu,
  onOpenPage,
  onOpenSettings,
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

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    onOpenMenu(item, { x: event.clientX, y: event.clientY }, null);
  };

  // Shift+F10 and the ContextMenu key open the menu from whichever control of the row has focus.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      opensSettings({
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        key: event.key,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        targetIsTextInput:
          event.target instanceof HTMLElement &&
          isTextEntry({
            inputType: event.target instanceof HTMLInputElement ? event.target.type : null,
            isContentEditable: event.target.isContentEditable,
            tagName: event.target.tagName,
          }),
      })
    ) {
      event.preventDefault();
      onOpenSettings(item);

      return;
    }
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) {
      return;
    }
    event.preventDefault();
    const origin = event.target instanceof HTMLElement ? event.target : event.currentTarget;
    const { bottom, left } = origin.getBoundingClientRect();
    onOpenMenu(item, { x: left, y: bottom }, origin);
  };

  const handleMenuButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    const { bottom, right } = event.currentTarget.getBoundingClientRect();
    onOpenMenu(item, { align: "end", x: right, y: bottom }, event.currentTarget);
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
      onContextMenu={handleContextMenu}
      onDoubleClick={() => {
        if (isFolder) {
          onOpenFolder?.(item.id);
        }
      }}
      // Shift click selects a range: stop the browser from selecting the text in between.
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.shiftKey) {
          event.preventDefault();
        }
      }}
      ref={drag.setRowRef}
      role="row"
      // Focusable by script, not by Tab: the new folder of the create dialog takes focus.
      tabIndex={-1}
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
      <div className="fr-folders-cell fr-folders-cell--menu" data-row-ignore role="gridcell">
        <button
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-label={translate("menuButton", { name: item.title })}
          className="fr-folders-menu-button"
          data-testid="row-menu-button"
          onClick={handleMenuButtonClick}
          type="button"
        >
          <MoreIcon />
        </button>
      </div>
    </div>
  );
};
