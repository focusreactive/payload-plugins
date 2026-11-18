"use client";

import { FieldError, FieldLabel, fieldBaseClass, useField } from "@payloadcms/ui";
import type { NumberFieldClientComponent } from "payload";
import type { CSSProperties } from "react";
import { useState } from "react";

const SCORES = [1, 2, 3, 4, 5] as const;

const baseClass = "rating-field";

/** A number field picked as one to five stars; the stored value stays a plain number. */
export const RatingField: NumberFieldClientComponent = ({
  field,
  path: pathFromProps,
  readOnly,
}) => {
  const { disabled, path, setValue, showError, value } = useField<number | null>({
    potentiallyStalePath: pathFromProps,
  });
  const [hovered, setHovered] = useState<number | null>(null);
  const isReadOnly = Boolean(readOnly || disabled);
  const shown = hovered ?? value ?? 0;

  return (
    <div
      className={[fieldBaseClass, baseClass, showError && "error", isReadOnly && "read-only"]
        .filter(Boolean)
        .join(" ")}
      style={
        field.admin?.width ? ({ "--field-width": field.admin.width } as CSSProperties) : undefined
      }
    >
      <FieldLabel
        label={field.label}
        localized={field.localized}
        path={path}
        required={field.required}
      />
      <div className={`${fieldBaseClass}__wrap`}>
        <FieldError path={path} showError={showError} />
        <div
          aria-label="Rating"
          className={`${baseClass}__stars`}
          onMouseLeave={() => setHovered(null)}
          role="radiogroup"
        >
          {SCORES.map((score) => (
            <button
              aria-checked={value === score}
              aria-label={`${score} of 5`}
              className={[`${baseClass}__star`, score <= shown && `${baseClass}__star--on`]
                .filter(Boolean)
                .join(" ")}
              disabled={isReadOnly}
              key={score}
              onClick={() => setValue(score)}
              onMouseEnter={() => setHovered(score)}
              role="radio"
              type="button"
            >
              ★
            </button>
          ))}
          <span className={`${baseClass}__value`}>{value ? `${value} / 5` : "No rating"}</span>
        </div>
      </div>
    </div>
  );
};
