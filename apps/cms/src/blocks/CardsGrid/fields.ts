import type { Field } from "payload";

import { imageField } from "@/fields/imageField";
import { link } from "@/fields/link";

import { CARD_ICONS } from "./icons";

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
        admin: {
          description: {
            en: "Optional icon shown in a tinted tile",
            es: "Icono opcional en un mosaico tintado",
          },
        },
        label: { en: "Icon", es: "Icono" },
        name: "icon",
        options: CARD_ICONS.map((icon) => ({ label: icon, value: icon })),
        type: "select",
      },
      {
        label: { en: "Title", es: "Título" },
        localized: true,
        name: "title",
        required: true,
        type: "text",
      },
      {
        label: { en: "Description", es: "Descripción" },
        localized: true,
        name: "description",
        type: "text",
      },
      imageField("image", { required: false }),
      link({ required: false }),
      {
        defaultValue: "center",
        label: { en: "Alignment", es: "Alineación" },
        name: "alignVariant",
        options: [
          { label: { en: "Left", es: "Izquierda" }, value: "left" },
          { label: { en: "Center", es: "Centro" }, value: "center" },
          { label: { en: "Right", es: "Derecha" }, value: "right" },
        ],
        type: "select",
      },
      {
        defaultValue: "none",
        label: { en: "Rounded", es: "Bordes redondeados" },
        name: "rounded",
        options: [
          { label: { en: "None", es: "Ninguno" }, value: "none" },
          { label: { en: "Large", es: "Grande" }, value: "large" },
        ],
        type: "select",
      },
      {
        defaultValue: "none",
        label: { en: "Background Color", es: "Color de fondo" },
        name: "backgroundColor",
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
        type: "select",
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
