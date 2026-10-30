import type { Translate } from "../compat.js";
import { anchorAfterRow, resolveGap } from "../DragAndDrop/dropTargets.js";
import type { DropRefusal, DropRules } from "../DragAndDrop/dropTargets.js";
import { dropRefusalText } from "../DragAndDrop/dropRefusalText.js";
import type { MoveTarget } from "../Move/moveFlow.js";
import { findLoadedFolder, itemKeyOf } from "../store.js";
import type { TreeStoreState } from "../store.js";
import type { TreeItem } from "../../types.js";
import type { ItemRowModel, TreeRowModel } from "./../Tree/useTreeData.js";

/** One insert marker of Move mode: a gap the moving rows can be put in (spec section 7.4). */
export type MoveMarker = {
  /** Whether putting the rows here leaves everything where it is. */
  isNoOp: boolean;
  /** `top`, `inside:<folder id>` or `after:<collection>:<id>`: what the marker is in the DOM. */
  key: string;
  /** Nesting level of the rows the marker sits between, from 0. */
  level: number;
  /** Why the gap refuses the rows, known from the rows on screen; `null` when it takes them. */
  refusal: DropRefusal | null;
  target: MoveTarget;
  /** The folder the rows land in; `null` is the top level. */
  targetFolder: TreeItem | null;
};

export type MoveModeRow =
  | { marker: MoveMarker; type: "marker" }
  | { row: TreeRowModel; type: "row" };

type PlaceInput = {
  /** The rows being moved, nested ones already left out. */
  moving: readonly TreeItem[];
  rules: DropRules;
  state: TreeStoreState;
};

/**
 * The rows on screen with an insert marker in every gap (spec section 7.4): one at the top of the
 * tree, one right under an open folder (the first row of its contents), and one after every row,
 * below everything open inside it. A folder with nothing in it counts as open, because otherwise
 * there would be no way to put rows into it from the keyboard. A closed folder has none: the
 * editor opens it, which Move mode allows.
 *
 * A gap is the same move as the drop on that spot, so the target and the refusal come from
 * `resolveGap`, the function drag and drop uses. A gap inside a moving folder is refused as a
 * cycle by the same check.
 */
export const placeMarkers = (
  rows: readonly TreeRowModel[],
  { moving, rules, state }: PlaceInput
): MoveModeRow[] => {
  const movingKeys = new Set(moving.map(itemKeyOf));

  const markerAt = (
    key: string,
    level: number,
    parentId: TreeItem["parentId"],
    anchor: TreeItem | null,
    targetFolder: TreeItem | null
  ): MoveModeRow => ({
    marker: {
      key,
      level,
      ...resolveGap({ anchor, dragged: moving, parentId, rules, state, targetFolder }),
    },
    type: "marker",
  });

  const afterMarker = (row: ItemRowModel): MoveModeRow => {
    const siblings = state.childrenByFolder[row.parentKey]?.items ?? [];

    return markerAt(
      `after:${row.key}`,
      row.level,
      row.item.parentId,
      anchorAfterRow(siblings, row.item, movingKeys),
      findLoadedFolder(state, row.item.parentId)
    );
  };

  const result: MoveModeRow[] = [markerAt("top", 0, null, null, null)];
  // Rows whose contents are still being listed: each one's own gap comes after its last row.
  const open: ItemRowModel[] = [];
  const closeDownTo = (level: number) => {
    while (open.length > 0 && (open.at(-1) as ItemRowModel).level >= level) {
      result.push(afterMarker(open.pop() as ItemRowModel));
    }
  };

  for (const row of rows) {
    closeDownTo(row.level);
    result.push({ row, type: "row" });
    if (row.type === "item") {
      open.push(row);
      if (row.item.kind === "folder" && (row.expanded || !row.expandable)) {
        result.push(markerAt(`inside:${row.item.id}`, row.level + 1, row.item.id, null, row.item));
      }
    }
  }
  closeDownTo(0);

  return result;
};

/** The reason a marker is off, as its tooltip words it; `null` when it can be picked. */
export const markerReasonOf = (
  marker: MoveMarker,
  { count, isBusy, translate }: { count: number; isBusy: boolean; translate: Translate }
): string | null => {
  if (isBusy) {
    return translate("menuBusy");
  }
  if (marker.refusal !== null) {
    return dropRefusalText(marker.refusal, translate);
  }

  return marker.isNoOp ? translate("moveModeNoOp", { count }) : null;
};
