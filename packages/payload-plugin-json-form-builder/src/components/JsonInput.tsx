"use client";

import { clsx as cn } from "clsx";
import type { ChangeEvent } from "react";
import { DatePicker, FieldLabel, TextInput } from "@payloadcms/ui";
import { numberOf } from "../field/typedJson.js";

// Payload ships a field component for all three, but each of them reads the form state and a typed
// json value lives in ours. `TextInput` is the one that does not, so the other two are Payload's
// markup around a plain input — and the three answer in one place, told which kind they are.
// A blank label leaves the box without one: a row's own header already carries the name.
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
  value: unknown;
}) => {
  if (kind === "number") {
    // A number written as text is shown rather than blanked — the box holds it, the checks read it
    // the same way, and the first edit writes it back as a number. Only a value no reading makes a
    // number stays out, and then it is said: an empty box over a value nobody can see is the worse
    // of the two.
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
        <DatePicker
          id={id}
          onChange={(next) => onChange(next ? next.toISOString() : null)}
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
