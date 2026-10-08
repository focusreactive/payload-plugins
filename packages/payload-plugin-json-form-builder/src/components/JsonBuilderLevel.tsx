"use client";

import { clsx as cn } from "clsx";
import {
  Banner,
  ChevronIcon,
  DragHandleIcon,
  DraggableSortable,
  DraggableSortableItem,
  EditIcon,
  Pill,
  XIcon,
} from "@payloadcms/ui";
import { IconButton } from "./IconButton.js";
import { labelOf } from "./JsonNode.js";
import { KINDS } from "../field/kinds.js";
import { holdsFields } from "../field/typedJson.js";
import type { NodeType, TypedNode } from "../field/typedJson.js";

const marks = (node: TypedNode) =>
  [
    node.required && "required",
    node.readOnly && "read only",
    node.hidden && "hidden",
    node.showIf && "conditional",
    "options" in node && node.options?.length ? `${node.options.length} options` : "",
  ].filter(Boolean) as string[];

type Hands = {
  onOpen: (index: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onOrder: (fields: TypedNode[]) => void;
};

export const JsonBuilderLevel = ({ fields, hands }: { fields: TypedNode[]; hands: Hands }) => {
  const ids = fields.map((node, index) => node.name || `#${index + 1}`);

  return (
    <DraggableSortable
      className="json-builder__cards"
      ids={ids}
      onDragEnd={({ moveFromIndex, moveToIndex }) =>
        hands.onOrder(
          fields.toSpliced(moveFromIndex, 1).toSpliced(moveToIndex, 0, fields[moveFromIndex])
        )
      }
    >
      {fields.map((node, index) => {
        const kind = KINDS[node.type as NodeType];
        const holds = holdsFields(node);
        return (
          <DraggableSortableItem id={ids[index]} key={ids[index]}>
            {({ attributes, isDragging, listeners, setNodeRef, transform, transition }) => (
              <div
                className={cn("json-builder__card", holds && "json-builder__card--holds")}
                ref={setNodeRef}
                style={{ transform, transition, zIndex: isDragging ? 1 : undefined }}
              >
                <span className="json-builder__grip" {...attributes} {...listeners}>
                  <DragHandleIcon />
                </span>
                <button
                  className="json-builder__card-open"
                  onClick={() => (holds ? hands.onOpen(index) : hands.onEdit(index))}
                  type="button"
                >
                  <span
                    className={cn(
                      "json-builder__tile",
                      `json-builder__tile--${kind?.group.toLowerCase() ?? "structure"}`
                    )}
                  >
                    {kind?.glyph ?? "?"}
                  </span>
                  <span className="json-builder__card-text">
                    <span className="json-builder__name">
                      {labelOf(node) || <em>no name</em>}
                      {node.name ? <code className="json-builder__key">#{node.name}</code> : null}
                    </span>
                    <span className="json-builder__marks">
                      {marks(node).map((mark) => (
                        <Pill key={mark} pillStyle="light-gray" size="small">
                          {mark}
                        </Pill>
                      ))}
                    </span>
                  </span>
                </button>
                <div className="json-builder__card-actions">
                  <IconButton label="Edit this field" onClick={() => hands.onEdit(index)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    className="json-builder__drop"
                    label="Remove this field"
                    onClick={() => hands.onRemove(index)}
                  >
                    <XIcon />
                  </IconButton>
                  {holds ? (
                    <span className="json-builder__door">
                      <ChevronIcon direction="right" />
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </DraggableSortableItem>
        );
      })}
      {fields.length ? null : (
        <Banner type="default">
          Nothing here yet. Pick a kind on the right and it lands in this level.
        </Banner>
      )}
    </DraggableSortable>
  );
};
