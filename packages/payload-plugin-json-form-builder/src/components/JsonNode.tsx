"use client";

import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Collapsible, FieldDescription } from "@payloadcms/ui";
import { toWords } from "payload/shared";
import { EyeIcon } from "./icons/EyeIcon.js";
import { JsonArray } from "./JsonArray.js";
import { JsonHolder } from "./JsonHolder.js";
import { JsonLeaf } from "./JsonLeaf.js";
import { JsonRowMenu } from "./JsonRowMenu.js";
import type { MenuItem } from "./JsonRowMenu.js";
import { nodeFault } from "../field/checks.js";
import { HIDDEN, visible } from "../field/typedJson.js";
import type { TypedNode } from "../field/typedJson.js";

export type Drag = ComponentProps<typeof Collapsible>["dragHandleProps"];
type Fold = Pick<ComponentProps<typeof Collapsible>, "isCollapsed" | "onToggle">;
export type NodeProps = Fold & {
  badge?: string;
  node: TypedNode;
  id: string;
  label: string;
  onChange: (node: TypedNode) => void;
  menu?: MenuItem[];
  drag?: Drag;
  top?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  faults?: boolean;
};

export const labelOf = (node?: TypedNode, key = "") => node?.label || toWords(node?.name || key);

export const isRowHidden = (row: TypedNode[]) =>
  row.some((field) => field.name === HIDDEN && "value" in field && field.value === true);
export const toggleRowHidden = (row: TypedNode[]): TypedNode[] =>
  isRowHidden(row)
    ? row.filter((field) => field.name !== HIDDEN)
    : [...row, { name: HIDDEN, type: "checkbox", value: true }];

export const hideItem = (node: TypedNode, onChange: (node: TypedNode) => void): MenuItem => ({
  icon: <EyeIcon open />,
  label: node.hidden ? "Show" : "Hide",
  onClick: () => onChange({ ...node, hidden: !node.hidden }),
});

export const JsonFields = ({
  faults,
  fields,
  id,
  onChange,
  row,
  readOnly,
}: {
  faults?: boolean;
  fields: TypedNode[];
  id: string;
  onChange: (fields: TypedNode[]) => void;
  row?: boolean;
  readOnly?: boolean;
}) => (
  <div className="json-form__fields">
    {fields.map((field, index) => {
      const set = (next: TypedNode) =>
        onChange(fields.map((entry, i) => (i === index ? next : entry)));
      if (row && field.name === HIDDEN) return null;
      if (!visible(field, fields)) return null;
      return (
        <JsonNode
          faults={faults}
          hidden={field.hidden}
          id={`${id}.${field.name ?? index}`}
          key={field.name ?? index}
          label={labelOf(field)}
          node={field}
          onChange={set}
          readOnly={readOnly}
        />
      );
    })}
  </div>
);

export const JsonNode = ({
  badge,
  node,
  id,
  label,
  onChange,
  menu,
  drag,
  top,
  hidden,
  isCollapsed,
  onToggle,
  faults,
  readOnly: parentReadOnly,
}: NodeProps) => {
  const readOnly = parentReadOnly || node.readOnly;
  const actions = menu && !readOnly && <JsonRowMenu items={menu} />;

  const fault = faults ? nodeFault(node) : "";
  const head = badge ? (
    <>
      {label}
      <span className="json-form__badge json-form__badge--shared">{badge}</span>
    </>
  ) : (
    label
  );

  if (node.type === "array")
    return (
      <JsonArray
        badge={badge}
        drag={drag}
        faults={faults}
        hidden={hidden}
        id={id}
        label={label}
        menu={menu}
        node={node}
        onChange={onChange}
        readOnly={readOnly}
        top={top}
      />
    );

  if ("fields" in node)
    return (
      <JsonHolder
        actions={actions}
        drag={drag}
        faults={faults}
        head={head}
        hidden={hidden}
        id={id}
        label={label}
        node={node}
        onChange={onChange}
        readOnly={readOnly}
        top={top}
      />
    );

  const own = drag || actions ? "" : label;
  const field = (
    <JsonLeaf
      fault={fault}
      id={id}
      label={label}
      node={node}
      onChange={onChange}
      own={own}
      readOnly={readOnly}
    />
  );
  const described = node.description ? (
    <>
      {field}
      <FieldDescription description={node.description} path={id} />
    </>
  ) : (
    field
  );
  if (!drag && !actions) return described;
  return (
    <Collapsible
      actions={actions}
      className="array-field__row"
      dragHandleProps={drag}
      header={<div className="array-field__row-header">{label}</div>}
      initCollapsed
      isCollapsed={isCollapsed}
      onToggle={onToggle}
    >
      {described}
    </Collapsible>
  );
};
