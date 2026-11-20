"use client";

import { FieldDescription, FieldError, FieldLabel, fieldBaseClass, useField } from "@payloadcms/ui";
import { mergeFieldStyles } from "@payloadcms/ui/shared";
import type { NumberFieldClientComponent } from "payload";

const STARS = [1, 2, 3, 4, 5] as const;

const FILLED = "#f5a524";
const EMPTY = "var(--theme-elevation-200)";

/**
 * Number field shown as five clickable stars. The stored value stays a plain 1–5 number,
 * so no schema change is needed; clicking the selected star again clears the rating.
 */
export const StarRatingField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { label, admin, required } = field;
  const { value, setValue, showError, errorMessage } = useField<number | null>({
    path: path ?? field.name,
  });
  const current = typeof value === "number" ? value : 0;

  return (
    <div className={`${fieldBaseClass} number`} style={mergeFieldStyles(field)}>
      <FieldLabel label={label} path={path} required={required} />
      <div style={{ position: "relative" }}>
        <FieldError message={errorMessage} path={path} showError={showError} />
        <div
          aria-label={typeof label === "string" ? label : "Rating"}
          id={`field-${(path ?? field.name).replaceAll(".", "__")}`}
          role="radiogroup"
          style={{ alignItems: "center", display: "flex", gap: 4, minHeight: 40 }}
        >
          {STARS.map((star) => (
            <button
              aria-checked={current === star}
              aria-label={`${star} / 5`}
              disabled={readOnly}
              key={star}
              onClick={() => setValue(current === star && !required ? null : star)}
              role="radio"
              style={{
                background: "none",
                border: 0,
                color: star <= current ? FILLED : EMPTY,
                cursor: readOnly ? "default" : "pointer",
                fontSize: 28,
                lineHeight: 1,
                padding: 2,
              }}
              title={`${star} / 5`}
              type="button"
            >
              ★
            </button>
          ))}
          <span style={{ color: "var(--theme-elevation-500)", marginLeft: 8 }}>
            {current ? `${current} / 5` : "–"}
          </span>
        </div>
      </div>
      <FieldDescription description={admin?.description} path={path} />
    </div>
  );
};
