"use client";

import { clsx as cn } from "clsx";
import type { ChangeEvent } from "react";
import { DatePicker, FieldLabel, TextInput } from "@payloadcms/ui";
import { numberOf } from "../field/typedJson.js";

export const JsonInput = ({
  fault,
  id,
  kind,
  label,
  max,
  min,
  onChange,
  readOnly,
  required,
  time,
  value,
}: {
  fault?: string;
  id: string;
  kind: "date" | "number" | "text";
  label?: string;
  max?: number;
  min?: number;
  onChange: (value: string | number | null) => void;
  readOnly?: boolean;
  required?: boolean;
  time?: boolean;
  value: unknown;
}) => {
  if (kind === "number") {
    const held = numberOf(value);
    const shown = Number.isFinite(held) ? held : "";
    const unread =
      shown === "" && value !== null && value !== undefined && String(value).trim() !== "";
    return (
      <div className={cn("field-type number", fault && "error")}>
        {label ? <FieldLabel label={label} path={id} required={required} /> : null}
        <div className="field-type__wrap">
          <input
            disabled={readOnly}
            id={`field-${id.replace(/\./g, "__")}`}
            max={max}
            min={min}
            name={id}
            onChange={(event) =>
              onChange(event.target.value === "" ? null : Number(event.target.value))
            }
            type="number"
            value={shown}
          />
          {unread ? (
            <p className="field-description">{`Holding ${JSON.stringify(value)}, which is not a number.`}</p>
          ) : null}
          {fault ? <p className="json-form__fault">{fault}</p> : null}
        </div>
      </div>
    );
  }

  if (kind === "date") {
    return (
      <div className={cn("field-type date-time-field", fault && "error")}>
        {label ? <FieldLabel label={label} path={id} required={required} /> : null}
        {/* Payload's "default" appearance overwrites whatever time was picked with noon, so a date
            node holds a time only while the picker is told to show one. */}
        <DatePicker
          id={id}
          onChange={(next) => onChange(next ? next.toISOString() : null)}
          pickerAppearance={time ? "dayAndTime" : "default"}
          readOnly={readOnly}
          value={value ? String(value) : undefined}
        />
        {fault ? <p className="json-form__fault">{fault}</p> : null}
      </div>
    );
  }

  return (
    <TextInput
      AfterInput={fault ? <p className="json-form__fault">{fault}</p> : undefined}
      label={label}
      showError={Boolean(fault)}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      path={id}
      readOnly={readOnly}
      required={required}
      value={String(value ?? "")}
    />
  );
};
