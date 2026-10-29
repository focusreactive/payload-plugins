import { useDraggable, useDroppable } from "@dnd-kit/core";
import { createContext, useCallback, useContext } from "react";

import type { TreeItem } from "../../types.js";
import type { DropIndicator } from "./dropTargets.js";

/** What the rows of the tree need to know about the drag in progress. */
export type DragRowState = {
  /** A move is in flight: no drag starts until it is done. */
  disabled: boolean;
  draggedKeys: ReadonlySet<string>;
  /** Where the line or the highlight of the gap under the pointer is drawn. */
  indicator: DropIndicator | null;
  /** The gap under the pointer refuses the rows. */
  isRefused: boolean;
};

const noDraggedKeys: ReadonlySet<string> = new Set();

export const DragStateContext = createContext<DragRowState>({
  disabled: false,
  draggedKeys: noDraggedKeys,
  indicator: null,
  isRefused: false,
});

/**
 * Makes one row a drag source and a drop target. The listeners go on the row, and the row is also
 * the activator node: without that, a key pressed in the row's checkbox would start a keyboard
 * drag, which has no drop logic until the keyboard ticket.
 */
export const useRowDrag = (item: TreeItem, rowKey: string) => {
  const { disabled, draggedKeys, indicator, isRefused } = useContext(DragStateContext);
  const data = { item };
  const {
    listeners,
    setActivatorNodeRef,
    setNodeRef: setDraggableRef,
  } = useDraggable({ data, disabled, id: rowKey });
  const { setNodeRef: setDroppableRef } = useDroppable({ data, id: rowKey });

  const setRowRef = useCallback(
    (node: HTMLElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
      setActivatorNodeRef(node);
    },
    [setActivatorNodeRef, setDraggableRef, setDroppableRef]
  );

  return {
    indicator: indicator?.rowKey === rowKey ? { ...indicator, isRefused } : null,
    isDragged: draggedKeys.has(rowKey),
    listeners,
    setRowRef,
  };
};
