import { ChevronIcon } from "@payloadcms/ui";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

import type { Translate } from "../compat.js";
import type { MenuAnchor, MenuEntry, MenuGroups, MenuLabel } from "./menuEntries.js";

export type PopupMenuProps = {
  anchor: MenuAnchor;
  groups: MenuGroups;
  /** The menu's accessible name. */
  label: string;
  /** `restoreFocus` is true when the keyboard closed it, so focus goes back to where it came from. */
  onClose: (restoreFocus: boolean) => void;
  /** An enabled entry was chosen; the menu closes right after. */
  onSelect: (entryId: string) => void;
  /** Test hook of the menu element. */
  testId?: string;
  translate: Translate;
};

/** Space kept between the menu and the window's edge. */
const edgeGap = 8;

const labelOf = (label: MenuLabel, translate: Translate): string =>
  "key" in label ? translate(label.key) : label.text;

const rootOwner = "root";

type MenuItemProps = {
  entry: MenuEntry;
  isSubmenuOpen: boolean;
  onActivate: (entry: MenuEntry) => void;
  onHover: (entry: MenuEntry) => void;
  owner: string;
  translate: Translate;
};

const MenuItem = ({
  entry,
  isSubmenuOpen,
  onActivate,
  onHover,
  owner,
  translate,
}: MenuItemProps) => {
  const reasonId = useId();
  const isOff = entry.reason !== null;
  const hasChildren = entry.children !== undefined;

  return (
    <div className="fr-folders-menu__row" role="none">
      <button
        aria-describedby={isOff ? reasonId : undefined}
        aria-disabled={isOff ? true : undefined}
        aria-expanded={hasChildren ? isSubmenuOpen : undefined}
        aria-haspopup={hasChildren ? "menu" : undefined}
        className="fr-folders-menu__item"
        data-entry-id={entry.id}
        data-has-children={hasChildren ? "true" : undefined}
        data-menu-owner={owner}
        data-testid="menu-item"
        onClick={() => onActivate(entry)}
        onMouseEnter={(event) => {
          onHover(entry);
          if (!isOff) {
            event.currentTarget.focus({ preventScroll: true });
          }
        }}
        role="menuitem"
        tabIndex={-1}
        type="button"
      >
        <span className="fr-folders-menu__label">{labelOf(entry.label, translate)}</span>
        {entry.badgeKey === undefined ? null : (
          <span className="fr-folders-chip fr-folders-chip--small" data-testid="menu-item-badge">
            {translate(entry.badgeKey)}
          </span>
        )}
        {hasChildren ? (
          <span aria-hidden="true" className="fr-folders-menu__arrow">
            <ChevronIcon direction="right" size={16} />
          </span>
        ) : null}
      </button>
      {entry.reason === null ? null : (
        <span className="fr-folders-menu__reason" data-testid="menu-item-reason" id={reasonId}>
          {translate(entry.reason.key, entry.reason.variables)}
        </span>
      )}
    </div>
  );
};

/**
 * A menu of entries in groups, opened at a point or under a button (spec section 7.5). It follows
 * the ARIA menu pattern: arrows, Home and End move between entries, Right opens a submenu and Left
 * or Escape closes it, Escape closes the menu. An entry that is off stays reachable, because the
 * reason beside it is the point of keeping it.
 */
export const PopupMenu = ({
  anchor,
  groups,
  label,
  onClose,
  onSelect,
  testId = "context-menu",
  translate,
}: PopupMenuProps): ReactNode => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: anchor.x, top: anchor.y });
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const [flipSubmenu, setFlipSubmenu] = useState(false);
  const [focusSubmenu, setFocusSubmenu] = useState(false);

  const itemsOf = (owner: string): HTMLElement[] =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        `[role="menuitem"][data-menu-owner="${owner}"]`
      ) ?? []
    );

  // Keeps the menu inside the window: it opens below and after the anchor when it fits, else
  // above or before it.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }
    const { height, width } = menu.getBoundingClientRect();
    const startLeft = anchor.align === "end" ? anchor.x - width : anchor.x;
    const left = Math.max(edgeGap, Math.min(startLeft, window.innerWidth - width - edgeGap));
    const fitsBelow = anchor.y + height + edgeGap <= window.innerHeight;
    const top = fitsBelow ? anchor.y : Math.max(edgeGap, anchor.y - height);
    setPosition({ left, top });
  }, [anchor]);

  useEffect(() => {
    itemsOf(rootOwner)[0]?.focus({ preventScroll: true });
    // Only on opening: later renders must not move focus the editor has already moved.
  }, []);

  // A submenu opens to the side, or the other side when the window ends there.
  useLayoutEffect(() => {
    if (openSubmenuId === null) {
      setFlipSubmenu(false);

      return;
    }
    const submenu = menuRef.current?.querySelector<HTMLElement>('[data-submenu="true"]');
    if (submenu) {
      const { right } = submenu.getBoundingClientRect();
      setFlipSubmenu(right > window.innerWidth - edgeGap);
    }
  }, [openSubmenuId]);

  useEffect(() => {
    if (openSubmenuId !== null && focusSubmenu) {
      itemsOf(openSubmenuId)[0]?.focus({ preventScroll: true });
      setFocusSubmenu(false);
    }
  }, [focusSubmenu, openSubmenuId]);

  // Anything that happens outside the menu ends it: a press elsewhere, a scroll, a resize.
  useEffect(() => {
    const closeOnOutsidePress = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) {
        return;
      }
      onClose(false);
    };
    const closeOnScroll = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) {
        return;
      }
      onClose(false);
    };
    const closeNow = () => onClose(false);
    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeNow);
    window.addEventListener("blur", closeNow);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress, true);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeNow);
      window.removeEventListener("blur", closeNow);
    };
  }, [onClose]);

  const activate = (entry: MenuEntry) => {
    if (entry.reason !== null) {
      return;
    }
    if (entry.children !== undefined) {
      setOpenSubmenuId(entry.id);
      setFocusSubmenu(true);

      return;
    }
    onSelect(entry.id);
    onClose(false);
  };

  const hover = (entry: MenuEntry, owner: string) => {
    // Pointing at an entry of the top level opens its submenu and closes any other one.
    if (owner !== rootOwner) {
      return;
    }
    setOpenSubmenuId(entry.children !== undefined && entry.reason === null ? entry.id : null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const owner = target?.dataset.menuOwner ?? rootOwner;
    const items = itemsOf(owner);
    const index = target ? items.indexOf(target) : -1;
    const focusAt = (next: number) => {
      items[(next + items.length) % items.length]?.focus({ preventScroll: true });
    };

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        focusAt(index + 1);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        focusAt(index === -1 ? -1 : index - 1);
        break;
      }
      case "Home": {
        event.preventDefault();
        focusAt(0);
        break;
      }
      case "End": {
        event.preventDefault();
        focusAt(-1);
        break;
      }
      case "ArrowRight": {
        if (
          target?.dataset.hasChildren === "true" &&
          target.getAttribute("aria-disabled") !== "true"
        ) {
          event.preventDefault();
          setOpenSubmenuId(target.dataset.entryId ?? null);
          setFocusSubmenu(true);
        }
        break;
      }
      case "ArrowLeft":
      case "Escape": {
        event.preventDefault();
        event.stopPropagation();
        if (owner === rootOwner) {
          if (event.key === "Escape") {
            onClose(true);
          }
        } else {
          setOpenSubmenuId(null);
          menuRef.current
            ?.querySelector<HTMLElement>(`[role="menuitem"][data-entry-id="${owner}"]`)
            ?.focus({ preventScroll: true });
        }
        break;
      }
      case "Tab": {
        event.preventDefault();
        onClose(true);
        break;
      }
      default: {
        break;
      }
    }
  };

  const renderEntry = (entry: MenuEntry, owner: string) => {
    const isSubmenuOpen = openSubmenuId === entry.id;

    return (
      <div className="fr-folders-menu__entry" key={entry.id}>
        <MenuItem
          entry={entry}
          isSubmenuOpen={isSubmenuOpen}
          onActivate={activate}
          onHover={(hovered) => hover(hovered, owner)}
          owner={owner}
          translate={translate}
        />
        {entry.children !== undefined && isSubmenuOpen ? (
          <div
            aria-label={labelOf(entry.label, translate)}
            className={`fr-folders-menu fr-folders-menu--sub${flipSubmenu ? " fr-folders-menu--flip" : ""}`}
            data-submenu="true"
            data-testid="context-submenu"
            role="menu"
          >
            {entry.children.map((child) => renderEntry(child, entry.id))}
          </div>
        ) : null}
      </div>
    );
  };

  return createPortal(
    // The keydown handler sits on the menu itself: focus is always on one of its entries.
    <div
      aria-label={label}
      className="fr-folders-menu"
      data-testid={testId}
      onKeyDown={handleKeyDown}
      ref={menuRef}
      role="menu"
      style={{ left: position.left, top: position.top }}
    >
      {groups.map((group, groupIndex) => (
        <div
          className={`fr-folders-menu__group${groupIndex > 0 ? " fr-folders-menu__group--divided" : ""}`}
          key={group.map((entry) => entry.id).join("|")}
          role="group"
        >
          {group.map((entry) => renderEntry(entry, rootOwner))}
        </div>
      ))}
    </div>,
    document.body
  );
};
