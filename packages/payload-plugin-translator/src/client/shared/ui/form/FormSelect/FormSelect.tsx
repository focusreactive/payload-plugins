import type { ReactElement } from "react";
import { useId } from "react";
import { useController } from "react-hook-form";

import Description from "../../Description";
import Label from "../../Label";
import Select from "../../Select";

interface FormSelectProps {
  name: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  label?: string | ReactElement;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

export default function FormSelect({
  name,
  required,
  options,
  label,
  description,
  disabled,
  size,
  placeholder,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className,
}: FormSelectProps) {
  const formControl = useController({ name, rules: { required } });
  const errorId = useId();
  const descriptionId = useId();

  const getAccessibilityProps = () => {
    if (label) {
      return {};
    }

    if (ariaLabelledby) {
      return { "aria-labelledby": ariaLabelledby };
    }

    if (ariaLabel) {
      return { "aria-label": ariaLabel };
    }

    return { "aria-label": "Select option" };
  };

  const selectElement = (
    <Select
      $size={size}
      hasError={formControl.fieldState.invalid}
      required={required}
      name={formControl.field.name}
      ref={formControl.field.ref}
      value={formControl.field.value}
      onChange={formControl.field.onChange}
      onBlur={formControl.field.onBlur}
      disabled={
        formControl.field.disabled ||
        formControl.formState.disabled ||
        formControl.formState.isSubmitting ||
        disabled
      }
      aria-describedby={`${errorId} ${descriptionId}`}
      {...getAccessibilityProps()}
    >
      {placeholder && (
        <Select.SelectEmptyOption>{placeholder}</Select.SelectEmptyOption>
      )}
      {options.map((option) => (
        <Select.SelectOption key={option.value} value={option.value}>
          {option.label}
        </Select.SelectOption>
      ))}
    </Select>
  );

  const errorAndDescription = (
    <>
      {formControl.fieldState.error && (
        <Description variant="error" id={errorId}>
          {formControl.fieldState.error.message}
        </Description>
      )}
      {description && (
        <Description id={descriptionId}>{description}</Description>
      )}
    </>
  );

  if (!label) {
    return (
      <div className={className}>
        {selectElement}
        {errorAndDescription}
      </div>
    );
  }

  return (
    <Label className={className} label={label}>
      {selectElement}
      {errorAndDescription}
    </Label>
  );
}
