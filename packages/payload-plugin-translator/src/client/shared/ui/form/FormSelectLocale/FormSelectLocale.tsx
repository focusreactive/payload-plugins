import { useLocaleOptions } from "../../../lib/payload/hooks/useLocaleOptions";
import FormSelect from "../FormSelect";

interface FormSelectProps {
  name: string;
  required?: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function FormSelectLocale({
  name,
  required,
  label,
  description,
  disabled,
  size,
  className,
}: FormSelectProps) {
  const localeOptions = useLocaleOptions();

  return (
    <FormSelect
      placeholder="-"
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
