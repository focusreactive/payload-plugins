import type { ReactElement } from "react";
import { useId } from "react";
import { useController } from "react-hook-form";

import { Checkbox } from "../../Checkbox";
import Description from "../../Description";

import styles from "./styles.module.scss";

interface FormCheckboxProps {
  name: string;
  label: string | ReactElement;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function FormCheckbox({
  name,
  label,
  description,
  disabled,
  className,
}: FormCheckboxProps) {
  const formControl = useController({ name });
  const errorId = useId();
  const descriptionId = useId();
  const inputId = useId();

  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      <label className={styles.label} htmlFor={inputId}>
        <Checkbox
          id={inputId}
          hasError={formControl.fieldState.invalid}
          name={formControl.field.name}
          ref={formControl.field.ref}
          checked={formControl.field.value ?? false}
          onChange={formControl.field.onChange}
          onBlur={formControl.field.onBlur}
          disabled={
            formControl.field.disabled ||
            formControl.formState.disabled ||
            formControl.formState.isSubmitting ||
            disabled
          }
          aria-describedby={`${errorId} ${descriptionId}`}
        />
        <span className={styles.label__text}>{label}</span>
      </label>
      {formControl.fieldState.error && (
        <Description variant="error" id={errorId}>
          {formControl.fieldState.error.message}
        </Description>
      )}
      {description && (
        <Description id={descriptionId}>{description}</Description>
      )}
    </div>
  );
}
