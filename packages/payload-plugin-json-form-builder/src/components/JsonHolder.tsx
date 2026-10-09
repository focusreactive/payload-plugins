"use client";

import { clsx as cn } from "clsx";
import { Collapsible, FieldDescription } from "@payloadcms/ui";
import { JsonFields } from "./JsonNode.js";
import { JsonFolded } from "./JsonFolded.js";
import { JsonTabs } from "./JsonTabs.js";
import type { Drag } from "./JsonNode.js";
import type { Container, TypedNode } from "../field/typedJson.js";
import type { ReactNode } from "react";

export const JsonHolder = ({
  actions,
  drag,
  faults,
  head,
  hidden,
  id,
  label,
  node,
  onChange,
  readOnly,
  top,
}: {
  actions: ReactNode;
  drag?: Drag;
  faults?: boolean;
  head: ReactNode;
  hidden?: boolean;
  id: string;
  label: string;
  node: Container;
  onChange: (node: TypedNode) => void;
  readOnly?: boolean;
  top?: boolean;
}) => {
  const Fold = top ? JsonFolded : Collapsible;

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
        header={head}
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
};
