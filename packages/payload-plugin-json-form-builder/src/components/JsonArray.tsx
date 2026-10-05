"use client";

import { clsx as cn } from "clsx";
import { useState } from "react";
import {
  Button,
  ChevronIcon,
  Collapsible,
  CopyIcon,
  DraggableSortable,
  DraggableSortableItem,
  FieldDescription,
  PlusIcon,
  useTranslation,
  XIcon,
} from "@payloadcms/ui";
import { formatLabels } from "payload/shared";
import { EyeIcon } from "./icons/EyeIcon.js";
import { JsonFolded } from "./JsonFolded.js";
import { isRowHidden, JsonFields, JsonNode, toggleRowHidden } from "./JsonNode.js";
import { JsonRowMenu } from "./JsonRowMenu.js";
import type { MenuItem } from "./JsonRowMenu.js";
import { nodeFault } from "../field/checks.js";
import { rowShape } from "../field/typedJson.js";
import type { ArrayNode, TypedNode } from "../field/typedJson.js";

const newId = () => Math.random().toString(36).slice(2);

const rowValue = (row: TypedNode[]) =>
  row
    .map((field) => ("value" in field && field.type === "text" ? String(field.value ?? "") : ""))
    .find(Boolean);

// An array laid out as Payload's array field. Each row gets an id that travels with it: an id per
// position would make a dropped row animate twice.
export const JsonArray = ({
  faults,
  node,
  id,
  label,
  onChange,
  menu,
  top,
  hidden,
  readOnly,
}: {
  faults?: boolean;
  node: ArrayNode;
  id: string;
  label: string;
  onChange: (node: TypedNode) => void;
  menu?: MenuItem[];
  top?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
}) => {
  const rows = node.rows ?? [];
  const { t } = useTranslation();
  const [rowIds, setIds] = useState(() => rows.map(newId));
  if (rowIds.length !== rows.length) setIds(rows.map(newId));
  const [open, setOpen] = useState<string[]>([]);
  const singular = formatLabels(node.name ?? label).singular || t("general:row");
  // What Payload's own array field does with the two: the button goes at the ceiling, and the last
  // rows down to the floor cannot be taken away.
  const atMax = Boolean(node.maxRows && rows.length >= node.maxRows);
  const atMin = Boolean(node.minRows && rows.length <= node.minRows);
  // A list nobody has put fields into yet: a row of it would be an accordion with nothing in it, so
  // there is nothing to add until the shape exists.
  const shapeless = !(node.rows?.[0] ?? node.fields ?? []).length;

  // `fields` only exists while the list is empty: it is the shape of the row that left, and the
  // next row to arrive takes it away again.
  const update = (nextIds: string[], nextRows: TypedNode[][]) => {
    setIds(nextIds);
    const { fields: _dropped, ...rest } = node;
    onChange(
      nextRows.length ? { ...rest, rows: nextRows } : { ...rest, fields: rowShape(node), rows: [] }
    );
  };
  const move = (from: number, to: number) => {
    const nextIds = [...rowIds];
    const nextRows = [...rows];
    nextIds.splice(to, 0, ...nextIds.splice(from, 1));
    nextRows.splice(to, 0, ...nextRows.splice(from, 1));
    update(nextIds, nextRows);
  };
  const insert = (index: number, row: TypedNode[]) =>
    update(rowIds.toSpliced(index, 0, newId()), rows.toSpliced(index, 0, row));
  const remove = (index: number) =>
    update(
      rowIds.filter((_, i) => i !== index),
      rows.filter((_, i) => i !== index)
    );
  const setRow = (index: number, row: TypedNode[]) =>
    onChange({ ...node, rows: rows.map((entry, i) => (i === index ? row : entry)) });

  // Payload's own row actions, minus the clipboard ones, which need the form state.
  const rowMenu = (index: number, row: TypedNode[]): MenuItem[] => [
    // A row of one unnamed field is a plain value; a switch inside it would turn it into an object.
    ...(row.length === 1 && !row[0].name
      ? []
      : [
          {
            icon: <EyeIcon open />,
            label: isRowHidden(row) ? "Show" : "Hide",
            onClick: () => setRow(index, toggleRowHidden(row)),
          },
        ]),
    ...(index > 0
      ? [
          {
            className: "json-form__action--move-up",
            label: t("general:moveUp"),
            onClick: () => move(index, index - 1),
            icon: (
              <div className="json-form__action-chevron">
                <ChevronIcon direction="up" />
              </div>
            ),
          },
        ]
      : []),
    ...(index < rows.length - 1
      ? [
          {
            label: t("general:moveDown"),
            onClick: () => move(index, index + 1),
            icon: (
              <div className="json-form__action-chevron">
                <ChevronIcon />
              </div>
            ),
          },
        ]
      : []),
    ...(atMax
      ? []
      : [
          {
            className: "json-form__action--add",
            icon: <PlusIcon />,
            label: t("general:addBelow"),
            onClick: () => insert(index + 1, rowShape(node)),
          },
          {
            className: "json-form__action--duplicate",
            icon: <CopyIcon />,
            label: t("general:duplicate"),
            onClick: () => insert(index + 1, structuredClone(rows[index])),
          },
        ]),
    ...(atMin
      ? []
      : [
          {
            className: "json-form__action--remove",
            icon: <XIcon />,
            label: t("general:remove"),
            onClick: () => remove(index),
          },
        ]),
  ];

  const list = (
    <DraggableSortable
      className="array-field__draggable-rows"
      ids={rowIds}
      onDragEnd={({ moveFromIndex, moveToIndex }) => move(moveFromIndex, moveToIndex)}
    >
      {rows.map((row, index) => {
        const rowId = rowIds[index];
        const value = rowValue(row);
        const name = [`${String(index + 1).padStart(2, "0")}.`, singular, value && `- ${value}`]
          .filter(Boolean)
          .join(" ");
        const toggle = (collapsed: boolean) =>
          setOpen(collapsed ? open.filter((entry) => entry !== rowId) : [...open, rowId]);
        return (
          <DraggableSortableItem id={rowId} key={rowId}>
            {({ attributes, isDragging, listeners, setNodeRef, transform, transition }) => {
              const drag = { id: rowId, attributes, listeners };
              return (
                <div
                  ref={setNodeRef}
                  style={{ transform, transition, zIndex: isDragging ? 1 : undefined }}
                >
                  {row.length === 1 && !row[0].name ? (
                    <JsonNode
                      drag={readOnly ? undefined : drag}
                      faults={faults}
                      id={`${id}.${index}`}
                      isCollapsed={!open.includes(rowId)}
                      label={name}
                      menu={readOnly ? undefined : rowMenu(index, row)}
                      node={row[0]}
                      onChange={(field) => setRow(index, [field])}
                      onToggle={toggle}
                    />
                  ) : (
                    <Collapsible
                      actions={readOnly ? undefined : <JsonRowMenu items={rowMenu(index, row)} />}
                      className={cn("array-field__row", isRowHidden(row) && "json-form__hidden")}
                      dragHandleProps={readOnly ? undefined : drag}
                      header={<div className="array-field__row-header">{name}</div>}
                      isCollapsed={!open.includes(rowId)}
                      onToggle={toggle}
                    >
                      <JsonFields
                        faults={faults}
                        fields={row}
                        id={`${id}.${index}`}
                        onChange={(next) => setRow(index, next)}
                        readOnly={readOnly}
                        row
                      />
                    </Collapsible>
                  )}
                </div>
              );
            }}
          </DraggableSortableItem>
        );
      })}
    </DraggableSortable>
  );

  const header = (!top || rows.length > 0) && (
    <header className="array-field__header">
      <div className="array-field__header-wrap">
        {/* Inside a section the accordion above already carries the name, so the heading names
				    what is below it instead — and the wrap is `space-between`, so it cannot be dropped. */}
        <div className="array-field__header-content">
          <h3 className="array-field__title">{top ? "Items" : label}</h3>
        </div>
        <ul className="array-field__header-actions">
          {rows.length > 0 && (
            <>
              <li>
                <button
                  className="array-field__header-action json-form__header-action"
                  onClick={() => setOpen([])}
                  type="button"
                >
                  {t("fields:collapseAll")}
                </button>
              </li>
              <li>
                <button
                  className="array-field__header-action json-form__header-action"
                  onClick={() => setOpen(rowIds)}
                  type="button"
                >
                  {t("fields:showAll")}
                </button>
              </li>
            </>
          )}
          {!top && menu && (
            <li>
              <JsonRowMenu items={menu} />
            </li>
          )}
        </ul>
      </div>
      {faults && nodeFault(node) ? <p className="json-form__fault">{nodeFault(node)}</p> : null}
      <FieldDescription description={node.description} path={id} />
    </header>
  );

  const body = (
    <>
      {header}
      {list}
      {shapeless ? (
        <p className="field-description">
          This list has no fields yet — add them with the gear above.
        </p>
      ) : (
        !atMax &&
        !readOnly && (
          <Button
            buttonStyle="icon-label"
            className="array-field__add-row json-form__add-row"
            icon="plus"
            iconPosition="left"
            iconStyle="with-border"
            onClick={() => insert(rows.length, rowShape(node))}
          >
            {t("fields:addLabel", { label: singular })}
          </Button>
        )
      )}
    </>
  );

  return top ? (
    <JsonFolded
      actions={menu && <JsonRowMenu items={menu} />}
      className={cn(hidden && "json-form__hidden")}
      header={label}
    >
      <div className="field-type array-field">{body}</div>
    </JsonFolded>
  ) : (
    <div className={cn("field-type array-field", hidden && "json-form__hidden")}>{body}</div>
  );
};
