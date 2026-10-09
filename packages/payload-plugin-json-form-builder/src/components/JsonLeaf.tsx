"use client";

import { clsx as cn } from "clsx";
import { CheckboxInput, SelectInput, TextareaInput } from "@payloadcms/ui";
import { JsonInput } from "./JsonInput.js";
import { JsonMediaInput } from "./JsonMediaInput.js";
import { JsonRadio } from "./JsonRadio.js";
import { JsonRichText } from "./JsonRichText.js";
import type { Leaf, TypedNode } from "../field/typedJson.js";

export const JsonLeaf = ({
  fault,
  id,
  label,
  node,
  onChange,
  own,
  readOnly,
}: {
  fault: string;
  id: string;
  label: string;
  node: Leaf;
  onChange: (node: TypedNode) => void;
  own: string;
  readOnly?: boolean;
}) => {
  const value = node.value ?? "";
  const set = (next: unknown) => onChange({ ...node, value: next });
  return node.type === "textarea" ? (
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
      time={node.time}
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
  ) : node.type === "radio" ? (
    <JsonRadio
      fault={fault}
      id={id}
      label={own}
      onChange={set}
      options={node.options ?? []}
      readOnly={readOnly}
      required={node.required}
      value={String(value)}
    />
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
};
