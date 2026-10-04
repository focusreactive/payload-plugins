import type { CollectionConfig } from "payload";

import { nobody, or, superAdmin, user } from "@/lib/access";

/**
 * Leads from the form block and the newsletter band (§5.6). Rows are written only by the
 * `/api/forms/submit` route through the Local API; REST create stays closed.
 */
export const FormSubmissions: CollectionConfig<"form-submissions"> = {
  access: {
    create: nobody,
    delete: superAdmin,
    read: or(superAdmin, user),
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["formName", "email", "page", "createdAt"],
    group: "Leads",
    useAsTitle: "email",
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          admin: { readOnly: true, width: "50%" },
          label: { en: "Form", es: "Formulario" },
          name: "formName",
          required: true,
          type: "text",
        },
        {
          admin: { readOnly: true, width: "50%" },
          label: { en: "Email", es: "Correo" },
          name: "email",
          type: "text",
        },
      ],
    },
    {
      admin: { readOnly: true },
      label: { en: "Page", es: "Página" },
      name: "page",
      type: "text",
    },
    {
      admin: { readOnly: true },
      label: { en: "Referrer", es: "Referente" },
      name: "referrer",
      type: "text",
    },
    {
      admin: { readOnly: true },
      fields: [
        {
          type: "row",
          fields: ["source", "medium", "campaign", "term", "content"].map((name) => ({
            admin: { width: "20%" },
            name,
            type: "text" as const,
          })),
        },
      ],
      label: "UTM",
      name: "utm",
      type: "group",
    },
    {
      admin: { readOnly: true },
      label: { en: "Submitted data", es: "Datos enviados" },
      name: "data",
      type: "json",
    },
  ],
  labels: {
    plural: { en: "Form submissions", es: "Envíos de formularios" },
    singular: { en: "Form submission", es: "Envío de formulario" },
  },
  slug: "form-submissions",
};
