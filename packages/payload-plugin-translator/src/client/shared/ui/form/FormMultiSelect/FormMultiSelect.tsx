import type { ReactElement } from "react";
import { useId } from "react";
import { useController } from "react-hook-form";

import Description from "../../Description";
import Label from "../../Label";
import MultiSelect from "../../MultiSelect";
import type { MultiSelectOption } from "../../MultiSelect";

type FormMultiSelectProps = {
  name: string;
  required?: boolean;
  options: MultiSelectOption[];
  label?: string | ReactElement;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
};

/**
 * Binds a react-hook-form field (a `string[]` value) to the {@link MultiSelect} primitive, with the
 * same label / description / error affordances as {@link FormSelect}. The single-select analogue is
 * `FormSelect`; this is its multi counterpart. A non-array field value is coerced to `[]`.
 */
export default function FormMultiSelect({
  name,
  required,
  options,
  label,
  description,
  placeholder,
  disabled,
  size,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className,
}: FormMultiSelectProps) {
  const { field, fieldState, formState } = useController({ name, rules: { required } });
  const errorId = useId();
  const descriptionId = useId();

  const value: string[] = Array.isArray(field.value) ? field.value : [];
  const isDisabled = field.disabled || formState.disabled || formState.isSubmitting || disabled;

  const control = (
    <MultiSelect
      value={value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      options={options}
      name={field.name}
      placeholder={placeholder}
      disabled={isDisabled}
      hasError={fieldState.invalid}
      $size={size}
      aria-describedby={`${errorId} ${descriptionId}`}
      aria-label={label ? undefined : (ariaLabel ?? "Select options")}
      aria-labelledby={label ? undefined : ariaLabelledby}
    />
  );

  const errorAndDescription = (
    <>
      {fieldState.error && (
        <Description variant="error" id={errorId}>
          {fieldState.error.message}
        </Description>
      )}
      {description && <Description id={descriptionId}>{description}</Description>}
    </>
  );

  if (!label) {
    return (
      <div className={className}>
        {control}
        {errorAndDescription}
      </div>
    );
  }

  return (
    <Label className={className} label={label} $size={size}>
      {control}
      {errorAndDescription}
    </Label>
  );
}
