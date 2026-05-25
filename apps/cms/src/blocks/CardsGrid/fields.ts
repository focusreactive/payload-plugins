import type { Field } from "payload";

import { imageField } from "@/fields/imageField";
import { link } from "@/fields/link";

export const cardsGridFields: Field[] = [
  {
    defaultValue: 3,
    label: { en: "Columns", es: "Columnas" },
    max: 4,
    min: 1,
    name: "columns",
    type: "number",
  },
  {
    fields: [
      {
        name: "title",
        type: "text",
        required: true,
        label: { en: "Title", es: "Título" },
        localized: true,
      },
      {
        name: "description",
        type: "text",
        label: { en: "Description", es: "Descripción" },
        localized: true,
      },
      imageField("image", { required: false }),
      link({ required: false }),
      {
        name: "alignVariant",
        type: "select",
        defaultValue: "center",
        options: [
          { label: { en: "Left", es: "Izquierda" }, value: "left" },
          { label: { en: "Center", es: "Centro" }, value: "center" },
          { label: { en: "Right", es: "Derecha" }, value: "right" },
        ],
        label: { en: "Alignment", es: "Alineación" },
      },
      {
        name: "rounded",
        type: "select",
        defaultValue: "none",
        options: [
          { label: { en: "None", es: "Ninguno" }, value: "none" },
          { label: { en: "Large", es: "Grande" }, value: "large" },
        ],
        label: { en: "Rounded", es: "Bordes redondeados" },
      },
      {
        name: "backgroundColor",
        type: "select",
        defaultValue: "none",
        options: [
          { label: { en: "None", es: "Ninguno" }, value: "none" },
          { label: { en: "Light", es: "Claro" }, value: "light" },
          { label: { en: "Dark", es: "Oscuro" }, value: "dark" },
          {
            label: { en: "Light Gray", es: "Gris claro" },
            value: "light-gray",
          },
          { label: { en: "Dark Gray", es: "Gris oscuro" }, value: "dark-gray" },
          {
            label: { en: "Gradient 2", es: "Gradiente 2" },
            value: "gradient-2",
          },
        ],
        label: { en: "Background Color", es: "Color de fondo" },
      },
    ],
    label: { en: "Cards", es: "Tarjetas" },
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];
