"use client";

import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import {
  CheckboxInput,
  Collapsible,
  FieldDescription,
  SelectInput,
  TextareaInput,
} from "@payloadcms/ui";
import { toWords } from "payload/shared";
import { EyeIcon } from "./icons/EyeIcon.js";
import { JsonArray } from "./JsonArray.js";
import { JsonFolded } from "./JsonFolded.js";
import { JsonInput } from "./JsonInput.js";
import { JsonMediaInput } from "./JsonMediaInput.js";
import { JsonRichText } from "./JsonRichText.js";
import { JsonRowMenu } from "./JsonRowMenu.js";
import type { MenuItem } from "./JsonRowMenu.js";
import { JsonTabs } from "./JsonTabs.js";
import { nodeFault } from "../field/checks.js";
import { HIDDEN, visible } from "../field/typedJson.js";
import type { TypedNode } from "../field/typedJson.js";

export type Drag = ComponentProps<typeof Collapsible>["dragHandleProps"];
type Fold = Pick<ComponentProps<typeof Collapsible>, "isCollapsed" | "onToggle">;
export type NodeProps = Fold & {
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

// A written `label` wins; otherwise the name is read as words, and a section falls back to its key.
export const labelOf = (node?: TypedNode, key = "") => node?.label || toWords(node?.name || key);

export const isRowHidden = (row: TypedNode[]) =>
  row.some((field) => field.name === HIDDEN && "value" in field && field.value === true);
export const toggleRowHidden = (row: TypedNode[]): TypedNode[] =>
  isRowHidden(row)
    ? row.filter((field) => field.name !== HIDDEN)
    : [...row, { name: HIDDEN, type: "checkbox", value: true }];

// `flatten` leaves a hidden node out of what the site gets, so the switch lives on the node itself
// and the name — the key a template reads — is never touched by hiding.
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
      // A row's own switch, which its card's menu owns: it is not a field to fill in. Elsewhere a
      // field of that name is an ordinary one and is drawn.
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

// One typed value as an admin field, drawn from its `type` alone.
export const JsonNode = ({
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
  // A section set read-only takes everything under it with it.
  const readOnly = parentReadOnly || node.readOnly;
  const actions = menu && !readOnly && <JsonRowMenu items={menu} />;
  // Only a section waits to be opened; below it accordions mount with it.
  const Fold = top ? JsonFolded : Collapsible;

  // Said under the field it is about, and only once a save has been turned down — before that an
  // unfilled field is simply one nobody has got to yet.
  const fault = faults ? nodeFault(node) : "";

  if (node.type === "array")
    return (
      <JsonArray
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

  if ("fields" in node) {
    const fields = (
      <JsonFields
        faults={faults}
        fields={node.fields}
        id={id}
        onChange={(next) => onChange({ ...node, fields: next })}
        readOnly={readOnly}
      />
    );
    if (node.type === "group" && !drag) {
      return (
        <div
          className={cn(
            "field-type group-field group-field--within-collapsible",
            hidden && "json-form__hidden"
          )}
        >
          <div className="group-field__header">
            <h3 className="group-field__title">{label}</h3>
            {actions}
          </div>
          <FieldDescription description={node.description} path={id} />
          {fields}
        </div>
      );
    }
    // A strip of tabs already says what it holds, so it is drawn bare. A section and a row's own
    // field keep the fold: that is where their header and their menu live.
    if (node.type === "tabs" && !drag && !top) {
      return (
        <div className={cn("field-type", hidden && "json-form__hidden")}>
          <FieldDescription description={node.description} path={id} />
          <JsonTabs faults={faults} id={id} node={node} onChange={onChange} />
        </div>
      );
    }
    return (
      <div className="field-type collapsible-field">
        <Fold
          actions={actions}
          className={cn("collapsible-field__collapsible", hidden && "json-form__hidden")}
          dragHandleProps={drag}
          header={label}
          initCollapsed
        >
          <FieldDescription description={node.description} path={id} />
          {node.type === "tabs" ? (
            <JsonTabs faults={faults} id={id} node={node} onChange={onChange} />
          ) : (
            fields
          )}
        </Fold>
      </div>
    );
  }

  const own = drag || actions ? "" : label;
  const value = node.value ?? "";
  const set = (next: unknown) => onChange({ ...node, value: next });
  const field =
    node.type === "textarea" ? (
      <TextareaInput
        AfterInput={fault ? <p className="json-form__fault">{fault}</p> : undefined}
        label={own}
        onChange={(event) => set(event.target.value)}
        path={id}
        readOnly={readOnly}
        required={node.required}
        showError={Boolean(fault)}
        value={String(value)}
      />
    ) : node.type === "number" ? (
      <JsonInput
        fault={fault}
        id={id}
        kind="number"
        label={own}
        max={node.max}
        min={node.min}
        onChange={set}
        readOnly={readOnly}
        required={node.required}
        value={node.value}
      />
    ) : node.type === "date" ? (
      <JsonInput
        fault={fault}
        id={id}
        kind="date"
        label={own}
        onChange={set}
        readOnly={readOnly}
        required={node.required}
        value={value}
      />
    ) : node.type === "checkbox" ? (
      <div className={cn("field-type checkbox", fault && "error")}>
        <CheckboxInput
          checked={Boolean(value)}
          id={id}
          label={label}
          name={id}
          onToggle={() => !readOnly && set(!value)}
          readOnly={readOnly}
          required={node.required}
        />
        {fault ? <p className="json-form__fault">{fault}</p> : null}
      </div>
    ) : node.type === "upload" ? (
      <JsonMediaInput
        fault={fault}
        id={id}
        label={own}
        onChange={set}
        readOnly={readOnly}
        required={node.required}
        url={String(value)}
      />
    ) : node.type === "richText" ? (
      <div className={cn(fault && "json-form__faulty")}>
        <JsonRichText html={String(value)} id={id} label={own} onChange={set} readOnly={readOnly} />
        {fault ? <p className="json-form__fault">{fault}</p> : null}
      </div>
    ) : node.type === "select" ? (
      <div className={cn("field-type select", fault && "error")}>
        <SelectInput
          label={own}
          name={id}
          onChange={(option) => set(option && !Array.isArray(option) ? option.value : "")}
          options={(node.options ?? []).map((option) => ({ label: option, value: option }))}
          path={id}
          readOnly={readOnly}
          required={node.required}
          value={String(value)}
        />
        {fault ? <p className="json-form__fault">{fault}</p> : null}
      </div>
    ) : (
      <JsonInput
        fault={fault}
        id={id}
        kind="text"
        label={own}
        onChange={set}
        readOnly={readOnly}
        required={node.required}
        value={value}
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
