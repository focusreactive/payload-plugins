import type { GroupField } from "payload";

export const sectionFields: GroupField = {
  fields: [
    {
      type: "row",
      fields: [
        {
          admin: {
            description: {
              en: "The colours this section is drawn in. The wording flips between black and white to stay readable, so you do not need to change any text.",
              es: "Los colores con los que se dibuja esta sección. El texto cambia entre negro y blanco para seguir siendo legible, así que no hace falta cambiar nada escrito.",
            },
            width: "50%",
          },
          label: { en: "Colours", es: "Colores" },
          name: "theme",
          options: [
            { label: { en: "White", es: "Blanco" }, value: "light" },
            { label: { en: "Black", es: "Negro" }, value: "dark" },
            { label: { en: "Soft green", es: "Verde suave" }, value: "light-gray" },
            { label: { en: "Charcoal", es: "Gris carbón" }, value: "dark-gray" },
          ],
          type: "select",
        },
        {
          admin: {
            description: {
              en: "Keep this section lined up with the rest of the page, or let it run the full width of the screen.",
              es: "Mantén esta sección alineada con el resto de la página o deja que ocupe todo el ancho de la pantalla.",
            },
            width: "50%",
          },
          defaultValue: "base",
          label: { en: "How wide the section runs", es: "Ancho de la sección" },
          name: "maxWidth",
          options: [
            { label: { en: "Edge to edge", es: "De borde a borde" }, value: "none" },
            { label: { en: "In line with the page", es: "Alineada con la página" }, value: "base" },
          ],
          type: "select",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          admin: {
            description: {
              en: "Breathing room above and below. Use none when this section is meant to sit tight against the one before it.",
              es: "Aire por encima y por debajo. Usa ninguno cuando esta sección deba quedar pegada a la anterior.",
            },
            width: "50%",
          },
          defaultValue: "base",
          label: { en: "Space above and below", es: "Espacio arriba y abajo" },
          name: "paddingY",
          options: [
            { label: { en: "None", es: "Ninguno" }, value: "none" },
            { label: { en: "Standard", es: "Estándar" }, value: "base" },
            { label: { en: "Generous", es: "Amplio" }, value: "large" },
          ],
          type: "select",
        },
        {
          admin: {
            description: {
              en: "The gap between this section and the left and right edges of the screen. Remove it only for a picture or a colour band meant to touch the edges.",
              es: "El margen entre esta sección y los bordes izquierdo y derecho de la pantalla. Quítalo solo para una imagen o una franja de color que deba tocar los bordes.",
            },
            width: "50%",
          },
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
