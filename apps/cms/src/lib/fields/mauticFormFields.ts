import type { Field } from "payload";

export function mauticFormFields({ required = true }: { required?: boolean } = {}): Field {
  return {
    type: "row",
    fields: [
      {
        admin: {
          width: "30%",
          description: { en: "The numeric id of the form in Mautic" },
        },
        label: { en: "Mautic form id" },
        name: "mauticFormId",
        required,
        type: "text",
        validate: (value: unknown) =>
          (!required && !value) || (typeof value === "string" && /^\d+$/u.test(value))
            ? true
            : "Use the numeric form id",
      },
      {
        admin: {
          width: "70%",
          description: { en: "The form alias in Mautic, e.g. contactus" },
        },
        label: { en: "Mautic form alias" },
        name: "mauticFormName",
        required,
        type: "text",
      },
    ],
  };
}
