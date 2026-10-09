"use client";

import { clsx as cn } from "clsx";
import { FieldLabel } from "@payloadcms/ui";

export const JsonRadio = ({
  fault,
  id,
  label,
  onChange,
  options,
  readOnly,
  required,
  value,
}: {
  fault: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  readOnly?: boolean;
  required?: boolean;
  value: string;
}) => (
  <div className={cn("field-type radio-group radio-group--layout-horizontal", fault && "error")}>
    {label ? <FieldLabel label={label} path={id} required={required} /> : null}
    <ul>
      {options.map((option) => {
        const chosen = value === option;
        return (
          <li key={option}>
            <label htmlFor={`${id}-${option}`}>
              <div className={cn("radio-input", chosen && "radio-input--is-selected")}>
                <input
                  checked={chosen}
                  disabled={readOnly}
                  id={`${id}-${option}`}
                  name={id}
                  onChange={() => onChange(option)}
                  type="radio"
                />
                <span className="radio-input__styled-radio" />
                <span className="radio-input__label">{option}</span>
              </div>
            </label>
          </li>
        );
      })}
    </ul>
    {fault ? <p className="json-form__fault">{fault}</p> : null}
  </div>
);
