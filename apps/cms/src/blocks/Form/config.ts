import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { link } from "@/lib/fields/link";

export const DEFAULT_MAUTIC_ACTION = "https://mautic.example.com/form/submit?formId=";

const SLUG_SAFE = /^[a-z][a-z0-9_]*$/u;

export const FormBlock: Block = injectSection({
  slug: "form",
  interfaceName: "FormBlock",
  ...getBlockPreviewImage("Form"),
  labels: {
    plural: { en: "Forms", es: "Formularios" },
    singular: { en: "Form", es: "Formulario" },
  },
  fields: [
    ...sectionHeaderFields(),
    {
      type: "row",
      fields: [
        {
          admin: {
            width: "34%",
            description: {
              en: "Internal: leads land in “Leads”. Mautic: plain HTML posted to your Mautic.",
              es: "Interno: los envíos van a “Leads”. Mautic: HTML enviado a su Mautic.",
            },
          },
          defaultValue: "internal",
          label: { en: "Mode", es: "Modo" },
          name: "mode",
          options: [
            { label: { en: "Internal (CMS)", es: "Interno (CMS)" }, value: "internal" },
            { label: "Mautic", value: "mautic" },
          ],
          required: true,
          type: "select",
        },
        {
          admin: {
            width: "66%",
            description: {
              en: "Identifier shown with each submission, e.g. contact, whitepaper-tsf",
              es: "Identificador mostrado con cada envío",
            },
          },
          label: { en: "Form name", es: "Nombre del formulario" },
          name: "formName",
          required: true,
          type: "text",
        },
      ],
    },
    {
      type: "row",
      admin: { condition: (_, siblingData) => siblingData?.mode === "mautic" },
      fields: [
        {
          admin: { width: "30%" },
          label: { en: "Mautic form id", es: "Id del formulario Mautic" },
          name: "mauticFormId",
          type: "text",
        },
        {
          admin: {
            width: "70%",
            description: {
              en: "The form id is appended to this URL",
              es: "El id del formulario se añade a esta URL",
            },
          },
          defaultValue: DEFAULT_MAUTIC_ACTION,
          label: { en: "Mautic action URL", es: "URL de acción de Mautic" },
          name: "mauticActionUrl",
          type: "text",
        },
      ],
    },
    {
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              admin: {
                width: "30%",
                description: { en: "lowercase, a–z 0–9 _", es: "minúsculas" },
              },
              label: { en: "Name", es: "Nombre" },
              name: "name",
              required: true,
              type: "text",
              validate: (value: unknown) =>
                typeof value === "string" && SLUG_SAFE.test(value)
                  ? true
                  : "Use lowercase letters, digits and _ (start with a letter)",
            },
            {
              admin: { width: "45%" },
              label: { en: "Label", es: "Etiqueta" },
              localized: true,
              name: "label",
              required: true,
              type: "text",
            },
            {
              admin: { width: "25%" },
              defaultValue: "text",
              label: { en: "Type", es: "Tipo" },
              name: "type",
              options: [
                { label: "Text", value: "text" },
                { label: "Email", value: "email" },
                { label: { en: "Phone", es: "Teléfono" }, value: "tel" },
                { label: { en: "Long text", es: "Texto largo" }, value: "textarea" },
                { label: { en: "Dropdown", es: "Desplegable" }, value: "select" },
                { label: { en: "Checkbox", es: "Casilla" }, value: "checkbox" },
              ],
              required: true,
              type: "select",
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              admin: { width: "40%" },
              label: { en: "Placeholder", es: "Marcador" },
              localized: true,
              name: "placeholder",
              type: "text",
            },
            {
              admin: {
                condition: (_, siblingData) => siblingData?.type === "select",
                width: "30%",
                description: { en: "Comma-separated", es: "Separadas por comas" },
              },
              label: { en: "Options", es: "Opciones" },
              name: "options",
              type: "text",
            },
            {
              admin: { width: "15%" },
              defaultValue: "full",
              label: { en: "Width", es: "Ancho" },
              name: "width",
              options: [
                { label: { en: "Full", es: "Completo" }, value: "full" },
                { label: { en: "Half", es: "Mitad" }, value: "half" },
              ],
              type: "select",
            },
            {
              admin: { style: { alignSelf: "flex-end" }, width: "15%" },
              label: { en: "Required", es: "Obligatorio" },
              name: "required",
              type: "checkbox",
            },
          ],
        },
      ],
      label: { en: "Fields", es: "Campos" },
      maxRows: 12,
      minRows: 1,
      name: "fields",
      required: true,
      type: "array",
    },
    {
      type: "row",
      fields: [
        {
          admin: { width: "40%" },
          defaultValue: createLocalizedDefault({ en: "Submit", es: "Enviar" }),
          label: { en: "Submit label", es: "Texto del botón" },
          localized: true,
          name: "submitLabel",
          type: "text",
        },
        {
          admin: { width: "60%" },
          defaultValue: createLocalizedDefault({
            en: "Thank you — we will be in touch shortly.",
            es: "Gracias, nos pondremos en contacto en breve.",
          }),
          label: { en: "Success message", es: "Mensaje de éxito" },
          localized: true,
          name: "successMessage",
          type: "text",
        },
      ],
    },
    {
      defaultValue: createLocalizedDefault({
        en: "By clicking submit, you agree that we may process your information in accordance with our Privacy Policy.",
        es: "Al enviar, acepta que tratemos su información de acuerdo con nuestra Política de privacidad.",
      }),
      label: { en: "Consent text", es: "Texto de consentimiento" },
      localized: true,
      name: "consentText",
      type: "textarea",
    },
    link({
      appearances: false,
      required: false,
      overrides: {
        admin: {
          description: {
            en: "Optional: shown after a successful submit (gated downloads)",
            es: "Opcional: se muestra tras el envío (descargas protegidas)",
          },
        },
        label: { en: "Success link", es: "Enlace tras el envío" },
        name: "successLink",
      },
    }),
  ],
});
