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
    node.type,
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
  onRemoveShape: (from: number, upto: number) => void;
  onOrder: (fields: TypedNode[]) => void;
};

type Row = { from: number; upto: number; shape?: string };

const rowsOf = (fields: TypedNode[]): Row[] => {
  const rows: Row[] = [];
  for (let at = 0; at < fields.length; ) {
    const shape = fields[at].shape;
    if (!shape) {
      rows.push({ from: at, upto: at + 1 });
      at += 1;
      continue;
    }
    let upto = at + 1;
    while (upto < fields.length && fields[upto].shape === shape) upto += 1;
    rows.push({ from: at, shape, upto });
    at = upto;
  }
  return rows;
};

const Card = ({
  grip,
  hands,
  index,
  node,
}: {
  grip: React.ReactNode;
  hands: Hands;
  index: number;
  node: TypedNode;
}) => {
  const kind = KINDS[node.type as NodeType];
  const holds = holdsFields(node);
  const fixed = Boolean(node.shape);
  const Body = fixed ? "span" : "button";

  return (
    <>
      {grip}
      <Body
        className="json-builder__card-open"
        onClick={fixed ? undefined : () => (holds ? hands.onOpen(index) : hands.onEdit(index))}
        type={fixed ? undefined : "button"}
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
      </Body>
      {fixed ? null : (
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
      )}
    </>
  );
};

export const JsonBuilderLevel = ({ fields, hands }: { fields: TypedNode[]; hands: Hands }) => {
  const rows = rowsOf(fields);
  const ids = rows.map((row) => fields[row.from].name || `#${row.from + 1}`);

  return (
    <DraggableSortable
      className="json-builder__cards"
      ids={ids}
      onDragEnd={({ moveFromIndex, moveToIndex }) =>
        hands.onOrder(
          rows
            .toSpliced(moveFromIndex, 1)
            .toSpliced(moveToIndex, 0, rows[moveFromIndex])
            .flatMap((row) => fields.slice(row.from, row.upto))
        )
      }
    >
      {rows.map((row, at) =>
        row.shape ? (
          <DraggableSortableItem id={ids[at]} key={ids[at]}>
            {({ attributes, isDragging, listeners, setNodeRef, transform, transition }) => (
              <div
                className="json-builder__shape"
                ref={setNodeRef}
                style={{ transform, transition, zIndex: isDragging ? 1 : undefined }}
              >
                <div className="json-builder__shape-head">
                  <span className="json-builder__grip" {...attributes} {...listeners}>
                    <DragHandleIcon />
                  </span>
                  <span className="json-builder__shape-name">{row.shape}</span>
                  <IconButton
                    className="json-builder__drop"
                    label={`Remove this ${row.shape}`}
                    onClick={() => hands.onRemoveShape(row.from, row.upto)}
                  >
                    <XIcon />
                  </IconButton>
                </div>
                {fields.slice(row.from, row.upto).map((node, offset) => (
                  <div className="json-builder__card" key={`${ids[at]}-${node.name ?? offset}`}>
                    <Card grip={null} hands={hands} index={row.from + offset} node={node} />
                  </div>
                ))}
              </div>
            )}
          </DraggableSortableItem>
        ) : (
          <DraggableSortableItem id={ids[at]} key={ids[at]}>
            {({ attributes, isDragging, listeners, setNodeRef, transform, transition }) => (
              <div
                className={cn(
                  "json-builder__card",
                  holdsFields(fields[row.from]) && "json-builder__card--holds"
                )}
                ref={setNodeRef}
                style={{ transform, transition, zIndex: isDragging ? 1 : undefined }}
              >
                <Card
                  grip={
                    <span className="json-builder__grip" {...attributes} {...listeners}>
                      <DragHandleIcon />
                    </span>
                  }
                  hands={hands}
                  index={row.from}
                  node={fields[row.from]}
                />
              </div>
            )}
          </DraggableSortableItem>
        )
      )}
      {fields.length ? null : (
        <Banner type="default">
          Nothing here yet. Pick a kind on the right and it lands in this level.
        </Banner>
      )}
    </DraggableSortable>
  );
};
