import { PointerSensor } from "@dnd-kit/core";
import type { CollisionDetection, Modifier, PointerSensorOptions } from "@dnd-kit/core";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { TreeItem } from "../../types.js";
import { dropZoneOf } from "./dropZones.js";
import type { DropZone } from "./dropZones.js";

/** Pixels the pointer travels before a press becomes a drag, so a click still clicks (spec 7.3). */
export const dragActivationDistance = 5;

/** What the pointer presses that is not the row's to drag: the checkbox, the chevron, a button. */
const dragIgnoreSelector = "button, input, label, [data-row-ignore]";

/**
 * The pointer sensor, except that a press on the row's own controls never starts a drag. The name
 * link does: it is most of the row.
 */
export class RowPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (
        { nativeEvent: event }: ReactPointerEvent,
        { onActivation }: PointerSensorOptions
      ): boolean => {
        if (!event.isPrimary || event.button !== 0) {
          return false;
        }
        if (event.target instanceof Element && event.target.closest(dragIgnoreSelector) !== null) {
          return false;
        }
        onActivation?.({ event });

        return true;
      },
    },
  ];
}

/** What the collision of a hovered row carries: the row's item and where on it the pointer is. */
export type RowHitData = { item: TreeItem; zone: DropZone };

/**
 * The row under the pointer, from the rows' live rectangles. The rectangles dnd-kit keeps are
 * measured when a drag starts and would be off once the list scrolls under a still pointer.
 */
export const rowUnderPointer: CollisionDetection = ({
  droppableContainers,
  pointerCoordinates,
}) => {
  if (!pointerCoordinates) {
    return [];
  }
  for (const container of droppableContainers) {
    const rect = container.node.current?.getBoundingClientRect();
    const item = container.data.current?.item as TreeItem | undefined;
    if (
      rect &&
      item &&
      pointerCoordinates.x >= rect.left &&
      pointerCoordinates.x <= rect.right &&
      pointerCoordinates.y >= rect.top &&
      pointerCoordinates.y < rect.bottom
    ) {
      const data: RowHitData = { item, zone: dropZoneOf(item.kind, pointerCoordinates.y, rect) };

      return [{ data, id: container.id }];
    }
  }

  return [];
};

const overlayOffset = 12;

/**
 * Puts the overlay just below and beside the pointer, not over the row it was picked up from. The
 * overlay is laid out at the top left of the window (see `DragAndDropProvider`), so the pointer's
 * position at the start of the drag plus how far it has travelled is where it goes; no rectangle
 * of the picked-up row is involved.
 */
export const overlayBesidePointer: Modifier = ({ activatorEvent, transform }) => {
  if (!(activatorEvent instanceof PointerEvent)) {
    return transform;
  }

  return {
    ...transform,
    x: transform.x + activatorEvent.clientX + overlayOffset,
    y: transform.y + activatorEvent.clientY + overlayOffset,
  };
};
