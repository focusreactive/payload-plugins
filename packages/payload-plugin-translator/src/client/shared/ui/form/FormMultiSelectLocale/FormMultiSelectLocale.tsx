import { useLocaleOptions } from "../../../lib/payload/hooks/useLocaleOptions";
import FormMultiSelect from "../FormMultiSelect";

type FormMultiSelectLocaleProps = {
  name: string;
  required?: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * The multi-locale counterpart of {@link FormSelectLocale}: feeds the configured locales into
 * {@link FormMultiSelect} so an editor can pick several target languages. Same name-bound interface as
 * `FormSelectLocale`, so a form swaps between them by mode with no other change.
 */
export default function FormMultiSelectLocale({
  name,
  required,
  label,
  description,
  disabled,
  size,
  className,
}: FormMultiSelectLocaleProps) {
  const localeOptions = useLocaleOptions();

  return (
    <FormMultiSelect
      size={size}
      className={className}
      description={description}
      label={label}
      required={required}
      name={name}
      options={localeOptions}
      disabled={disabled}
    />
  );
}
