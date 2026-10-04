export type FormFieldType = "text" | "email" | "tel" | "textarea" | "select" | "checkbox";

export interface FormFieldProps {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string | null;
  options?: string[];
  width?: "full" | "half";
}

export interface FormProps {
  /** DOM id of the wrapper; `${domId}-ok` is the no-JS success anchor. */
  domId: string;
  mode: "internal" | "mautic";
  action: string;
  formName: string;
  /** Block id, posted back so the success redirect can target this form. */
  formId: string;
  mauticFormId?: string | null;
  fields: FormFieldProps[];
  submitLabel: string;
  consentText?: string | null;
  successMessage: string;
  successLink?: { href: string; label: string } | null;
}
