import { cn } from "@/components/utils";

import type { FormFieldProps } from "./types";

function fieldName(name: string, mautic: boolean) {
  return mautic ? `mauticform[${name}]` : name;
}

export function FormField({
  field,
  domId,
  mautic,
}: {
  field: FormFieldProps;
  domId: string;
  mautic: boolean;
}) {
  const id = `${domId}-${field.name}`;
  const name = fieldName(field.name, mautic);
  const required = Boolean(field.required);
  const span = field.width === "half" ? "md:col-span-1" : "md:col-span-2";

  if (field.type === "checkbox") {
    return (
      <div className={cn("ct-field flex items-start gap-3", span)}>
        <input
          id={id}
          name={name}
          type="checkbox"
          value="yes"
          required={required}
          className="ct-checkbox"
        />
        <label htmlFor={id} className="text-small text-foreground">
          {field.label}
          {required && <span className="ct-required"> *</span>}
        </label>
      </div>
    );
  }

  const common = {
    "aria-required": required || undefined,
    className: "ct-input",
    id,
    name,
    placeholder: field.placeholder ?? undefined,
    required,
  };

  return (
    <div className={cn("ct-field flex flex-col gap-1.5", span)}>
      <label htmlFor={id} className="ct-label">
        {field.label}
        {required && <span className="ct-required"> *</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea {...common} rows={5} />
      ) : field.type === "select" ? (
        <select {...common} defaultValue="">
          <option value="" disabled>
            {field.placeholder ?? "Select…"}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={field.type}
          autoComplete={field.type === "email" ? "email" : field.type === "tel" ? "tel" : undefined}
        />
      )}
    </div>
  );
}
