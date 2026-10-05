import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { link } from "@/lib/fields/link";
import { mauticFormFields } from "@/lib/fields/mauticFormFields";

const SLUG_SAFE = /^[a-z][a-z0-9_]*$/u;

export const FormBlock: Block = injectSection({
  slug: "form",
  interfaceName: "FormBlock",
  ...getBlockPreviewImage("Form"),
  labels: {
    plural: "Forms",
    singular: "Form",
  },
  fields: [
    ...sectionHeaderFields(),
    mauticFormFields(),
    {
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              admin: {
                width: "30%",
                description: "The field alias in Mautic",
              },
              label: "Name",
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
              label: "Label",
              localized: true,
              name: "label",
              required: true,
              type: "text",
            },
            {
              admin: { width: "25%" },
              defaultValue: "text",
              label: "Type",
              name: "type",
              options: [
                { label: "Text", value: "text" },
                { label: "Email", value: "email" },
                { label: "Phone", value: "tel" },
                { label: "Long text", value: "textarea" },
                { label: "Dropdown", value: "select" },
                { label: "Checkbox", value: "checkbox" },
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
              label: "Placeholder",
              localized: true,
              name: "placeholder",
              type: "text",
            },
            {
              admin: {
                condition: (_, siblingData) => siblingData?.type === "select",
                width: "30%",
                description: "Comma-separated",
              },
              label: "Options",
              name: "options",
              type: "text",
            },
            {
              admin: { width: "15%" },
              defaultValue: "full",
              label: "Width",
              name: "width",
              options: [
                { label: "Full", value: "full" },
                { label: "Half", value: "half" },
              ],
              type: "select",
            },
            {
              admin: { style: { alignSelf: "flex-end" }, width: "15%" },
              label: "Required",
              name: "required",
              type: "checkbox",
            },
          ],
        },
      ],
      label: "Fields",
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
          defaultValue: createLocalizedDefault({ en: "Submit" }),
          label: "Submit label",
          localized: true,
          name: "submitLabel",
          type: "text",
        },
        {
          admin: { width: "60%" },
          defaultValue: createLocalizedDefault({
            en: "Thank you — we will be in touch shortly.",
          }),
          label: "Success message",
          localized: true,
          name: "successMessage",
          type: "text",
        },
      ],
    },
    {
      defaultValue: createLocalizedDefault({
        en: "By clicking submit, you agree that we may process your information in accordance with our Privacy Policy.",
      }),
      label: "Consent text",
      localized: true,
      name: "consentText",
      type: "textarea",
    },
    link({
      appearances: false,
      required: false,
      overrides: {
        admin: {
          description: "Optional: shown after a successful submit (gated downloads)",
        },
        label: "Success link",
        name: "successLink",
      },
    }),
  ],
});
