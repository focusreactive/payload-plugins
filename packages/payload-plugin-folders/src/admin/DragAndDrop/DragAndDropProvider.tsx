import { DndContext, DragOverlay, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { TreeItem } from "../../types.js";
import type { Translate } from "../compat.js";
import type { DropMove } from "../Move/useMoveFlow.js";
import { itemKeyOf } from "../store.js";
import type { TreeStore, TreeStoreState } from "../store.js";
import type { TreeRowModel } from "../Tree/useTreeData.js";
import { DragStateContext } from "./dragState.js";
import type { DragRowState } from "./dragState.js";
import { dropRefusalText } from "./dropRefusalText.js";
import { draggedItemsOf, resolveDrop } from "./dropTargets.js";
import type { DropResolution, DropRules } from "./dropTargets.js";
import type { DropZone } from "./dropZones.js";
import {
  dragActivationDistance,
  overlayBesidePointer,
  RowPointerSensor,
  rowUnderPointer,
} from "./pointerSensors.js";
import type { RowHitData } from "./pointerSensors.js";

/** How long a closed folder is hovered before it opens (spec section 7.3). */
export const autoExpandDelayMs = 600;

/** The body classes the stylesheet turns into the grabbing and not-allowed cursors. */
const draggingBodyClass = "fr-folders-dragging";
const refusedBodyClass = "fr-folders-dragging--refused";

type Hit = { key: string; zone: DropZone };

type Carried = { isSelection: boolean; items: TreeItem[] };

export type DragAndDropProviderProps = {
  children: ReactNode;
  /** A move is in flight: no drag starts until it is done. */
  disabled: boolean;
  /** Called with the move a drop asks for, never for a refused gap or one that changes nothing. */
  onDrop: (drop: DropMove) => void;
  rows: readonly TreeRowModel[];
  rules: DropRules;
  selectedItems: readonly TreeItem[];
  state: TreeStoreState;
  store: TreeStore;
  translate: Translate;
};

const hitOf = (event: DragEndEvent | DragMoveEvent | DragOverEvent): Hit | null => {
  const [collision] = event.collisions ?? [];
  const data = collision?.data as RowHitData | undefined;

  return collision && data ? { key: String(collision.id), zone: data.zone } : null;
};

// Dragging by keyboard is the keyboard ticket's: until then these stay silent, because dnd-kit's
// own announcements would read out the raw row keys.
const silentAnnouncements = {
  onDragCancel: () => undefined,
  onDragEnd: () => undefined,
  onDragMove: () => undefined,
  onDragOver: () => undefined,
  onDragStart: () => undefined,
};

/**
 * Drag and drop for the tree rows (spec section 7.3): the drag context, the line or highlight of
 * the gap under the pointer, the overlay that follows it, the folder that opens when hovered, and
 * the hand-over of a finished drop to the move flow.
 */
export const DragAndDropProvider = ({
  children,
  disabled,
  onDrop,
  rows,
  rules,
  selectedItems,
  state,
  store,
  translate,
}: DragAndDropProviderProps) => {
  // The keyboard sensor is registered for the keyboard ticket; the rows keep it from starting.
  const sensors = useSensors(
    useSensor(RowPointerSensor, { activationConstraint: { distance: dragActivationDistance } }),
    useSensor(KeyboardSensor)
  );
  const [carried, setCarried] = useState<Carried | null>(null);
  const [hit, setHit] = useState<Hit | null>(null);

  const resolution = useMemo<DropResolution | null>(
    () =>
      carried && hit
        ? resolveDrop({ dragged: carried.items, over: hit, rows, rules, state })
        : null,
    [carried, hit, rows, rules, state]
  );
  const isRefused = resolution?.refusal != null;

  const track = (event: DragMoveEvent | DragOverEvent) => {
    const next = hitOf(event);
    setHit((current) =>
      current?.key === next?.key && current?.zone === next?.zone ? current : next
    );
  };

  const stop = () => {
    setCarried(null);
    setHit(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const grabbed = event.active.data.current?.item as TreeItem | undefined;
    if (grabbed) {
      setCarried(draggedItemsOf(grabbed, selectedItems));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const landed = hitOf(event);
    const dropped =
      carried && landed
        ? resolveDrop({ dragged: carried.items, over: landed, rows, rules, state })
        : null;
    stop();
    if (!carried || !dropped || dropped.refusal !== null || dropped.isNoOp) {
      return;
    }
    onDrop({
      items: carried.items,
      selection: carried.isSelection ? selectedItems : null,
      target: dropped.target,
      targetTitle: dropped.targetFolder?.title ?? translate("moveToRoot"),
    });
  };

  const isDragging = carried !== null;
  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }
    document.body.classList.add(draggingBodyClass);

    return () => document.body.classList.remove(draggingBodyClass);
  }, [isDragging]);
  useEffect(() => {
    if (!isDragging || !isRefused) {
      return undefined;
    }
    document.body.classList.add(refusedBodyClass);

    return () => document.body.classList.remove(refusedBodyClass);
  }, [isDragging, isRefused]);

  // A closed folder under the pointer opens once it has been there for a moment.
  const hoveredRow =
    resolution?.indicator.edge === "inside"
      ? rows.find((row) => row.type === "item" && row.key === resolution.indicator.rowKey)
      : undefined;
  const folderToOpen =
    hoveredRow?.type === "item" && hoveredRow.expandable && !hoveredRow.expanded
      ? hoveredRow.item.id
      : null;
  useEffect(() => {
    if (folderToOpen === null) {
      return undefined;
    }
    const timer = setTimeout(() => void store.setExpanded(folderToOpen, true), autoExpandDelayMs);

    return () => clearTimeout(timer);
  }, [folderToOpen, store]);

  const rowState = useMemo<DragRowState>(
    () => ({
      disabled,
      draggedKeys: new Set((carried?.items ?? []).map(itemKeyOf)),
      indicator: resolution?.indicator ?? null,
      isRefused,
    }),
    [carried, disabled, isRefused, resolution]
  );

  const overlayLabel =
    carried?.items.length === 1
      ? (carried.items[0] as TreeItem).title
      : translate("dragItems", { count: carried?.items.length ?? 0 });

  return (
    <DndContext
      accessibility={{
        announcements: silentAnnouncements,
        screenReaderInstructions: { draggable: "" },
      }}
      collisionDetection={rowUnderPointer}
      onDragCancel={stop}
      onDragEnd={handleDragEnd}
      onDragMove={track}
      onDragOver={track}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <DragStateContext.Provider value={rowState}>{children}</DragStateContext.Provider>
      <DragOverlay
        dropAnimation={null}
        modifiers={[overlayBesidePointer]}
        style={{ height: "auto", left: 0, top: 0, width: "max-content" }}
      >
        {carried === null ? null : (
          <div
            className="fr-folders-drag-overlay"
            data-refused={isRefused ? "true" : undefined}
            data-testid="drag-overlay"
          >
            <span data-testid="drag-overlay-label">{overlayLabel}</span>
            {resolution?.refusal ? (
              <div className="fr-folders-drag-reason" data-testid="drop-reason" role="tooltip">
                {dropRefusalText(resolution.refusal, translate)}
              </div>
            ) : null}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
