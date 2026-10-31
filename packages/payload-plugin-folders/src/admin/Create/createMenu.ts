import type { MenuEntry, MenuGroups } from "../Menu/menuEntries.js";
import type { PageTypeOption } from "./pageTypes.js";

/** Id prefix of a menu entry that creates a page; the rest is the page collection's slug. */
export const createPageEntryPrefix = "createPage:";

/** One entry per page type, the default type first and marked (spec section 7.2). */
export const pageTypeEntries = (pageTypes: readonly PageTypeOption[]): MenuEntry[] =>
  pageTypes.map((type) => ({
    ...(type.isDefault ? { badgeKey: "createDefaultBadge" as const } : {}),
    id: `${createPageEntryPrefix}${type.collection}`,
    label: { text: type.label },
    reason: null,
  }));

/**
 * The header's Create menu (spec section 7.2): Folder, a divider, then one entry per page type the
 * folder it creates in allows. The context menu's "Create page here" lists the same type entries.
 */
export const buildCreateMenu = (pageTypes: readonly PageTypeOption[]): MenuGroups =>
  [
    [{ id: "createFolder", label: { key: "createFolderEntry" as const }, reason: null }],
    pageTypeEntries(pageTypes),
  ].filter((group) => group.length > 0);
