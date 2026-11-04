import { DndContext, DragOverlay, useSensor, useSensors } from "@dnd-kit/core";
import type {
  Announcements,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { TreeItem } from "../../types.js";
import type { Translate } from "../compat.js";
import type { DropMove } from "../Move/useMoveFlow.js";
import { loadedItemsOf } from "../store.js";
import type { TreeStore, TreeStoreState } from "../store.js";
import type { TreeRowModel } from "../Tree/useTreeData.js";
import { DragStateContext } from "./dragState.js";
import type { DragRowState } from "./dragState.js";
import { dropRefusalText } from "./dropRefusalText.js";
import { draggedItemsOf, resolveCrumbDrop, resolveDrop } from "./dropTargets.js";
import type { DropResolution, DropRules } from "./dropTargets.js";
import type { DropZone } from "./dropZones.js";
import {
  dragActivationDistance,
  overlayBesidePointer,
  RowPointerSensor,
  rowUnderPointer,
} from "./pointerSensors.js";
import type { RowHitData } from "./pointerSensors.js";
import { itemKey } from "../../core/itemKey.js";

/** How long a closed folder is hovered before it opens (spec section 7.3). */
export const autoExpandDelayMs = 600;

/**
 * Swallows the click a cancelled drag still ends in. Pressing a row, dragging, pressing Escape and
 * letting go over the row where the drag began makes the browser fire a click there, which would
 * open a page or toggle a folder; dnd-kit swallows its own click for 50 ms after a drag, and a
 * mouse held through an Escape is released later than that. The blocker comes off after the
 * release, one tick later, because the click is dispatched right after the release.
 */
const blockClickAfterRelease = (): void => {
  const block = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const release = () => {
    document.removeEventListener("pointerup", release, true);
    setTimeout(() => document.removeEventListener("click", block, true), 0);
  };
  document.addEventListener("click", block, true);
  document.addEventListener("pointerup", release, true);
};

/** The body classes the stylesheet turns into the grabbing and not-allowed cursors. */
const draggingBodyClass = "fr-folders-dragging";
const refusedBodyClass = "fr-folders-dragging--refused";

/** What is under the pointer: a row, or a breadcrumb (whose folder `null` is the top level). */
type Hit = { crumb?: { folder: TreeItem | null }; key: string; zone: DropZone };

type Carried = { grabbedKey: string; isSelection: boolean; items: TreeItem[] };

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
  if (!collision || !data) {
    return null;
  }

  return "crumb" in data
    ? { crumb: data.crumb, key: String(collision.id), zone: data.zone }
    : { key: String(collision.id), zone: data.zone };
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
  // The pointer is the only sensor. Keyboard users move rows with Move mode, Alt and the arrow
  // keys, and cut and paste, which reach every place a drag can and ask the same confirmation;
  // dnd-kit's keyboard sensor would be a second, slower way to the same moves.
  const sensors = useSensors(
    useSensor(RowPointerSensor, { activationConstraint: { distance: dragActivationDistance } })
  );
  const [carried, setCarried] = useState<Carried | null>(null);
  const [hit, setHit] = useState<Hit | null>(null);

  const resolveHit = useCallback(
    (landed: Hit, dragged: readonly TreeItem[]): DropResolution | null =>
      landed.crumb
        ? resolveCrumbDrop({ dragged, folder: landed.crumb.folder, rules, state })
        : resolveDrop({ dragged, over: landed, rows, rules, state }),
    [rows, rules, state]
  );
  const resolution = useMemo<DropResolution | null>(
    () => (carried && hit ? resolveHit(hit, carried.items) : null),
    [carried, hit, resolveHit]
  );
  const isRefused = resolution?.refusal != null;

  // What the announcements read. dnd-kit calls `onDragOver` before it announces, so the refs are
  // current when the words are built.
  const carriedRef = useRef<Carried | null>(null);
  const resolutionRef = useRef<DropResolution | null>(null);
  const lastWordsRef = useRef("");

  const track = (event: DragMoveEvent | DragOverEvent) => {
    const next = hitOf(event);
    resolutionRef.current =
      next && carriedRef.current ? resolveHit(next, carriedRef.current.items) : null;
    // A breadcrumb's folder row changes as the breadcrumbs are read again; the key names it.
    setHit((current) =>
      current?.key === next?.key && current?.zone === next?.zone ? current : next
    );
  };

  const stop = () => {
    setCarried(null);
    setHit(null);
  };

  // Words for a screen reader, with the rows' titles where dnd-kit would read out their keys.
  const announcements = useMemo<Announcements>(() => {
    const nameOf = (items: readonly TreeItem[] | undefined): string =>
      items?.length === 1
        ? (items[0] as TreeItem).title
        : translate("dragItems", { count: items?.length ?? 0 });
    const whereOf = (dropped: DropResolution): string => {
      const { after } = dropped.target;
      if (after) {
        const anchor = loadedItemsOf(state).find((item) => itemKey(item) === itemKey(after));

        return translate("dragWhereAfter", { target: anchor?.title ?? "" });
      }

      return translate("dragWhereInside", {
        target: dropped.targetFolder?.title ?? translate("moveToRoot"),
      });
    };

    return {
      onDragCancel: () => translate("dragCancelled", { name: nameOf(carriedRef.current?.items) }),
      onDragEnd: () => {
        const name = nameOf(carriedRef.current?.items);
        const latest = resolutionRef.current;
        if (latest === null || latest.refusal !== null || latest.isNoOp) {
          return translate("dragNotMoved", { name });
        }

        return translate("dragDropped", { name, where: whereOf(latest) });
      },
      // The place under the pointer changes inside one row as often as from row to row (the top, the
      // middle and the bottom of a folder are three places), and dnd-kit only reports a change of
      // row. So the words are built on every move, and said when they differ from the last ones.
      onDragMove: () => {
        const name = nameOf(carriedRef.current?.items);
        const latest = resolutionRef.current;
        if (latest === null || (latest.refusal === null && latest.isNoOp)) {
          return undefined;
        }
        const words =
          latest.refusal === null
            ? translate("dragRelease", { name, where: whereOf(latest) })
            : translate("dragOverRefused", {
                name,
                reason: dropRefusalText(latest.refusal, translate),
              });
        if (words === lastWordsRef.current) {
          return undefined;
        }
        lastWordsRef.current = words;

        return words;
      },
      onDragOver: () => undefined,
      onDragStart: ({ active }) => {
        const grabbed = active.data.current?.item as TreeItem | undefined;

        return translate("dragPickedUp", {
          name: nameOf(grabbed ? draggedItemsOf(grabbed, selectedItems).items : undefined),
        });
      },
    };
  }, [selectedItems, state, translate]);

  const handleDragStart = (event: DragStartEvent) => {
    const grabbed = event.active.data.current?.item as TreeItem | undefined;
    if (grabbed) {
      carriedRef.current = {
        ...draggedItemsOf(grabbed, selectedItems),
        grabbedKey: String(event.active.id),
      };
      resolutionRef.current = null;
      lastWordsRef.current = "";
      setCarried(carriedRef.current);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const landed = hitOf(event);
    const dropped = carried && landed ? resolveHit(landed, carried.items) : null;
    stop();
    if (!carried || !dropped || dropped.refusal !== null || dropped.isNoOp) {
      return;
    }
    onDrop({
      items: carried.items,
      selection: carried.isSelection ? selectedItems : null,
      target: dropped.target,
      // A folder whose row is not known yet has an id and no title.
      targetTitle:
        dropped.targetFolder?.title ??
        translate(dropped.target.toFolder === null ? "moveToRoot" : "folder"),
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
  // A folder with nothing in it has nothing to show by opening it, and opening it would move the
  // rows under the pointer.
  const folderToOpen =
    hoveredRow?.type === "item" &&
    hoveredRow.expandable &&
    !hoveredRow.expanded &&
    (hoveredRow.item.childCount ?? 1) > 0
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
      draggedKeys: new Set((carried?.items ?? []).map(itemKey)),
      grabbedKey: carried?.grabbedKey ?? null,
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
      accessibility={{ announcements, screenReaderInstructions: { draggable: "" } }}
      collisionDetection={rowUnderPointer}
      onDragCancel={() => {
        stop();
        blockClickAfterRelease();
      }}
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
