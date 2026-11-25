import type { GroupField } from "payload";

export const sectionFields: GroupField = {
  fields: [
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          label: { en: "Theme", es: "Tema" },
          name: "theme",
          options: [
            // The redesign is dark-only: the stored values are kept, but each one now
            // selects a surface treatment instead of a light/dark palette.
            { label: { en: "Base (black)", es: "Base (negro)" }, value: "light" },
            { label: { en: "Ink (lifted black)", es: "Tinta (negro elevado)" }, value: "dark" },
            { label: { en: "Glass panel", es: "Panel de cristal" }, value: "light-gray" },
            {
              label: { en: "Glass panel + glow", es: "Panel de cristal + resplandor" },
              value: "dark-gray",
            },
          ],
          type: "select",
        },
        {
          admin: { width: "50%" },
          defaultValue: "base",
          label: { en: "Max Width", es: "Ancho Máximo" },
          name: "maxWidth",
          options: [
            { label: { en: "None", es: "Ninguno" }, value: "none" },
            { label: { en: "Base", es: "Base" }, value: "base" },
          ],
          type: "select",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          defaultValue: "base",
          label: { en: "Padding Y", es: "Relleno Vertical" },
          name: "paddingY",
          options: [
            { label: { en: "None", es: "Ninguno" }, value: "none" },
            { label: { en: "Base", es: "Base" }, value: "base" },
            { label: { en: "Large", es: "Grande" }, value: "large" },
          ],
          type: "select",
        },
        {
          admin: { width: "50%" },
          defaultValue: "base",
          label: { en: "Padding X", es: "Relleno Horizontal" },
          name: "paddingX",
          options: [
            { label: { en: "None", es: "Ninguno" }, value: "none" },
            { label: { en: "Base", es: "Base" }, value: "base" },
          ],
          type: "select",
        },
      ],
    },
    {
      fields: [
        {
          admin: {
            description: {
              en: 'Upload an image or video. Use the "Background" folder.',
              es: 'Sube una imagen o video. Usa la carpeta "Background".',
            },
          },
          filterOptions: () => ({
            "folder.name": {
              equals: "Background",
            },
          }),
          label: {
            en: "Background (Image or Video)",
            es: "Fondo (Imagen o Video)",
          },
          name: "media",
          relationTo: "media",
          type: "upload",
        },
        {
          fields: [
            {
              name: "overlay",
              type: "select",
              dbName: "sec_bg_ovrly",
              label: { en: "Overlay Color", es: "Color de Capa" },
              options: [
                { label: { en: "Black", es: "Negro" }, value: "black" },
                { label: { en: "White", es: "Blanco" }, value: "white" },
              ],
              admin: {
                width: "50%",
                condition: (_, siblingData) => !!siblingData?.media,
              },
            },
            {
              name: "opacity",
              type: "number",
              label: { en: "Overlay Opacity (%)", es: "Opacidad de Capa (%)" },
              min: 0,
              max: 100,
              defaultValue: 35,
              admin: {
                width: "50%",
                condition: (_, siblingData) => !!siblingData?.overlay,
                description: {
                  en: "0 = transparent, 100 = fully opaque",
                  es: "0 = transparente, 100 = completamente opaco",
                },
              },
            },
          ],
          type: "row",
        },
      ],
      label: { en: "Background", es: "Fondo" },
      name: "background",
      type: "group",
    },
  ],
  label: false,
  name: "section",
  type: "group",
};
