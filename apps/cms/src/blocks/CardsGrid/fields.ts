import { definePreview } from "@focus-reactive/payload-plugin-stacked-editing";
import type { Field } from "payload";

import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";

import { CARD_ICONS } from "./icons";

/** Layouts the grid component supports (`ui/index.tsx` maps each to a `lg:grid-cols-*`). */
export const CARDS_GRID_COLUMNS = ["1", "2", "3", "4"] as const;

export const cardsGridFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: {
          description: {
            en: "Cards per row on wide screens. Phones always show one per row.",
            es: "Tarjetas por fila en pantallas anchas. En móviles siempre se muestra una por fila.",
          },
          width: "25%",
        },
        defaultValue: "3",
        label: { en: "Cards per row", es: "Tarjetas por fila" },
        name: "columns",
        options: CARDS_GRID_COLUMNS.map((value) => ({ label: value, value })),
        type: "select",
      },
      {
        admin: { width: "25%" },
        defaultValue: "center",
        label: { en: "Card text alignment", es: "Alineación del texto" },
        name: "alignVariant",
        options: [
          { label: { en: "Left", es: "Izquierda" }, value: "left" },
          { label: { en: "Center", es: "Centro" }, value: "center" },
          { label: { en: "Right", es: "Derecha" }, value: "right" },
        ],
        type: "select",
      },
      {
        admin: { width: "25%" },
        defaultValue: "none",
        label: { en: "Card corners", es: "Esquinas de las tarjetas" },
        name: "rounded",
        options: [
          { label: { en: "Standard", es: "Estándar" }, value: "none" },
          { label: { en: "Extra rounded", es: "Más redondeadas" }, value: "large" },
        ],
        type: "select",
      },
      {
        admin: { width: "25%" },
        defaultValue: "none",
        label: { en: "Card background", es: "Fondo de las tarjetas" },
        name: "backgroundColor",
        options: [
          { label: { en: "None", es: "Ninguno" }, value: "none" },
          { label: { en: "Light", es: "Claro" }, value: "light" },
          { label: { en: "Dark", es: "Oscuro" }, value: "dark" },
          { label: { en: "Light Gray", es: "Gris claro" }, value: "light-gray" },
          { label: { en: "Dark Gray", es: "Gris oscuro" }, value: "dark-gray" },
          { label: { en: "Gradient", es: "Gradiente" }, value: "gradient-2" },
        ],
        type: "select",
      },
    ],
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
            admin: { width: "40%" },
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
    ],
    label: { en: "Cards", es: "Tarjetas" },
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];
