import type { TreeItem } from "../../types.js";

export type ToolbarAction =
  | "delete"
  | "duplicate"
  | "move"
  | "moveTo"
  | "publish"
  | "settings"
  | "unpublish";

/** The order of the buttons in the toolbar (spec section 7.2). */
export const toolbarActions: readonly ToolbarAction[] = [
  "move",
  "moveTo",
  "duplicate",
  "publish",
  "unpublish",
  "delete",
  "settings",
];

export type ActionState = {
  /** Why the button is off, `null` when it is on. The reason names no item, so it leaks nothing. */
  disabledBecause: "access" | null;
  /** Settings is for exactly one item; with more it is not shown at all. */
  visible: boolean;
};

/**
 * The row access flag each action needs on every selected row. Duplicate has none: copies are new
 * documents, so it asks `canCreate` instead (the rows carry no create flag).
 */
const flagByAction: Record<ToolbarAction, "delete" | "publish" | "update" | null> = {
  delete: "delete",
  duplicate: null,
  move: "update",
  moveTo: "update",
  publish: "publish",
  settings: "update",
  unpublish: "publish",
};

/**
 * Which buttons the toolbar offers for a selection. An action is off when any selected row denies
 * the flag it needs, so the UI never offers what a row refuses (the server checks again).
 */
export const toolbarStateOf = (
  items: readonly TreeItem[],
  {
    canCreate = () => true,
  }: {
    /** Whether the user may create documents in a collection; Duplicate needs it for every row. */
    canCreate?: (collection: string) => boolean;
  } = {}
): Record<ToolbarAction, ActionState> => {
  const states = {} as Record<ToolbarAction, ActionState>;
  for (const action of toolbarActions) {
    const flag = flagByAction[action];
    const isAllowed =
      flag === null
        ? items.every((item) => canCreate(item.collection))
        : items.every((item) => item.access[flag]);
    states[action] = {
      disabledBecause: isAllowed ? null : "access",
      visible: action !== "settings" || items.length === 1,
    };
  }

  return states;
};
