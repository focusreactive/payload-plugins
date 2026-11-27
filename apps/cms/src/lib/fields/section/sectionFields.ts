import type { GroupField } from "payload";

export const sectionFields: GroupField = {
  fields: [
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          label: { en: "Section look", es: "Aspecto de la sección" },
          name: "theme",
          options: [
            // The site is dark-only: the stored values are kept, but each one now selects a
            // surface treatment instead of a light/dark palette.
            { label: { en: "Black", es: "Negro" }, value: "light" },
            { label: { en: "Soft black", es: "Negro suave" }, value: "dark" },
            { label: { en: "Glass panel", es: "Panel de cristal" }, value: "light-gray" },
            {
              label: { en: "Glass panel with glow", es: "Panel de cristal con brillo" },
              value: "dark-gray",
            },
          ],
          type: "select",
        },
        {
          admin: { width: "50%" },
          defaultValue: "base",
          label: { en: "Content width", es: "Ancho del contenido" },
          name: "maxWidth",
          options: [
            { label: { en: "Full width", es: "Ancho completo" }, value: "none" },
            { label: { en: "Standard", es: "Estándar" }, value: "base" },
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
          label: { en: "Space above and below", es: "Espacio arriba y abajo" },
          name: "paddingY",
          options: [
            { label: { en: "None", es: "Ninguno" }, value: "none" },
            { label: { en: "Standard", es: "Estándar" }, value: "base" },
            { label: { en: "Large", es: "Grande" }, value: "large" },
          ],
          type: "select",
        },
        {
          admin: { width: "50%" },
          defaultValue: "base",
          label: { en: "Space at the sides", es: "Espacio a los lados" },
          name: "paddingX",
          options: [
            { label: { en: "None", es: "Ninguno" }, value: "none" },
            { label: { en: "Standard", es: "Estándar" }, value: "base" },
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
              en: 'Pick an image or video from the "Background" folder.',
              es: 'Elige una imagen o un video de la carpeta "Background".',
            },
          },
          filterOptions: () => ({
            "folder.name": {
              equals: "Background",
            },
          }),
          label: {
            en: "Background image or video",
            es: "Imagen o video de fondo",
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
              label: { en: "Tint over the background", es: "Velo sobre el fondo" },
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
              label: { en: "Tint strength (%)", es: "Intensidad del velo (%)" },
              min: 0,
              max: 100,
              defaultValue: 35,
              admin: {
                width: "50%",
                condition: (_, siblingData) => !!siblingData?.overlay,
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
