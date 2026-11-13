import type { FoldersTranslationKey } from "../../translations/index.js";

/** Why an entry is off, as a translation key with its variables, so the rules need no `t`. */
export type MenuReason = {
  key: FoldersTranslationKey;
  variables?: Record<string, number | string>;
};

export type MenuLabel = { key: FoldersTranslationKey } | { text: string };

/** One line of a menu. An entry with a reason is off: shown, never hidden, with the reason beside it. */
export type MenuEntry = {
  /** Marks the entry, such as "default" on a page type. */
  badgeKey?: FoldersTranslationKey;
  /** A submenu: the entry opens these instead of doing anything itself. */
  children?: readonly MenuEntry[];
  id: string;
  label: MenuLabel;
  reason: MenuReason | null;
};

/** Entries in groups; the menu draws a divider between two groups. */
export type MenuGroups = readonly (readonly MenuEntry[])[];

/** Where a menu opens: the pointer, or an element's corner. */
export type MenuAnchor = {
  /** `end` puts the menu's right edge at `x`, for a button at the end of a row. */
  align?: "end" | "start";
  x: number;
  y: number;
};
