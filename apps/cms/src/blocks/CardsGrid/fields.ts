import { definePreview } from "@focus-reactive/payload-plugin-stacked-editing";
import type { Field } from "payload";

import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";

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
    admin: {
      custom: {
        preview: definePreview({ title: "title", subtitle: "description", media: "image" }),
      },
      initCollapsed: true,
    },
    fields: [
      {
        type: "row",
        fields: [
          {
            admin: {
              width: "40%",
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
            admin: { width: "60%" },
            label: { en: "Title", es: "Título" },
            localized: true,
            name: "title",
            required: true,
            type: "text",
          },
        ],
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
        type: "row",
        fields: [
          {
            admin: { width: "33%" },
            defaultValue: "left",
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
            admin: { width: "33%" },
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
            admin: { width: "34%" },
            defaultValue: "none",
            label: { en: "Background Color", es: "Color de fondo" },
            name: "backgroundColor",
            options: [
              { label: { en: "Glass (default)", es: "Cristal (por defecto)" }, value: "none" },
              { label: { en: "Glass", es: "Cristal" }, value: "light" },
              { label: { en: "Ink", es: "Tinta" }, value: "dark" },
              {
                label: { en: "Frosted glass", es: "Cristal esmerilado" },
                value: "light-gray",
              },
              { label: { en: "Ink (lifted)", es: "Tinta (elevada)" }, value: "dark-gray" },
              {
                label: { en: "Brand gradient", es: "Degradado de marca" },
                value: "gradient-2",
              },
            ],
            type: "select",
          },
        ],
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
