"use client";

import {
  Button,
  CheckboxInput,
  DatePicker,
  FieldLabel,
  SelectInput,
  TextareaInput,
  TextInput,
} from "@payloadcms/ui";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { ParamDef } from "../../types.js";
import { initialInputs, optionsOf, paramLabel, readParams } from "../shared/format.js";
import type { ParamInput } from "../shared/format.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

interface Props {
  defs: ParamDef[];
  submitLabel: string;
  onSubmit: (params: Record<string, unknown>) => void;
  onCancel: () => void;
}

const pathOf = (def: ParamDef) => `workflow-param-${def.name}`;

/** The small form an action's `params` describe, validated before it is sent. */
export const ParamForm = ({ defs, submitLabel, onSubmit, onCancel }: Props) => {
  const { t } = useWorkflowsT();
  const [inputs, setInputs] = useState<Record<string, ParamInput>>(() => initialInputs(defs));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (name: string, value: ParamInput) => {
    setInputs((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      const { [name]: _cleared, ...rest } = current;
      return rest;
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The drawer is portalled out of the document's form, but React still bubbles the submit to it.
    event.stopPropagation();
    const result = readParams(defs, inputs, t);
    setErrors(result.errors);
    if (Object.keys(result.errors).length === 0) {
      onSubmit(result.params);
    }
  };

  const field = (def: ParamDef): ReactNode => {
    const path = pathOf(def);
    const label = paramLabel(def);
    const value = inputs[def.name];
    const text = typeof value === "string" ? value : "";
    const showError = Boolean(errors[def.name]);
    switch (def.type) {
      case "text":
        return (
          <TextareaInput
            description={def.description}
            label={label}
            onChange={(event) => set(def.name, event.target.value)}
            path={path}
            required={def.required}
            rows={4}
            showError={showError}
            value={text}
          />
        );
      case "boolean":
        return (
          <CheckboxInput
            checked={value === true}
            id={`field-${path}`}
            label={label}
            name={path}
            onToggle={(event) => set(def.name, event.target.checked)}
          />
        );
      case "select":
        return (
          <SelectInput
            description={def.description}
            label={label}
            name={path}
            onChange={(option) => {
              const picked = Array.isArray(option) ? option[0] : option;
              set(def.name, typeof picked?.value === "string" ? picked.value : "");
            }}
            options={optionsOf(def)}
            path={path}
            placeholder={t("paramsChoose")}
            required={def.required}
            showError={showError}
            value={text}
          />
        );
      case "date":
        return (
          <div className="field-type workflows-params__date">
            <FieldLabel label={label} path={path} required={def.required} />
            <DatePicker
              id={`field-${path}`}
              onChange={(date) => set(def.name, date ? date.toISOString() : "")}
              pickerAppearance="dayOnly"
              value={text || undefined}
            />
          </div>
        );
      default:
        return (
          <TextInput
            description={def.description}
            htmlAttributes={def.type === "number" ? ({ inputMode: "decimal" } as never) : undefined}
            label={label}
            onChange={(event: { target: { value: string } }) => set(def.name, event.target.value)}
            path={path}
            required={def.required}
            showError={showError}
            value={text}
          />
        );
    }
  };

  return (
    <form className="workflows-params" noValidate onSubmit={submit}>
      {defs.map((def) => (
        <div
          className="workflows-params__field"
          data-invalid={Boolean(errors[def.name])}
          key={def.name}
        >
          {field(def)}
          {errors[def.name] ? (
            <p className="workflows-params__error" id={`${pathOf(def)}-error`} role="alert">
              {errors[def.name]}
            </p>
          ) : null}
        </div>
      ))}
      <div className="workflows-params__actions">
        <Button buttonStyle="primary" size="medium" type="submit">
          {submitLabel}
        </Button>
        <Button buttonStyle="secondary" onClick={onCancel} size="medium">
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
};
