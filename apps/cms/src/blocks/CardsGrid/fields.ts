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
            en: "On wide screens. Phones always show one card per row.",
            es: "En pantallas anchas. En móviles siempre se muestra una tarjeta por fila.",
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
        label: { en: "Card alignment", es: "Alineación de las tarjetas" },
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
        label: { en: "Rounded corners", es: "Bordes redondeados" },
        name: "rounded",
        options: [
          { label: { en: "None", es: "Ninguno" }, value: "none" },
          { label: { en: "Large", es: "Grande" }, value: "large" },
        ],
        type: "select",
      },
      {
        admin: { width: "25%" },
        defaultValue: "none",
        label: { en: "Card background color", es: "Color de fondo de las tarjetas" },
        name: "backgroundColor",
        options: [
          { label: { en: "None", es: "Ninguno" }, value: "none" },
          { label: { en: "Light", es: "Claro" }, value: "light" },
          { label: { en: "Dark", es: "Oscuro" }, value: "dark" },
          { label: { en: "Light gray", es: "Gris claro" }, value: "light-gray" },
          { label: { en: "Dark gray", es: "Gris oscuro" }, value: "dark-gray" },
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
    labels: {
      plural: { en: "Cards", es: "Tarjetas" },
      singular: { en: "Card", es: "Tarjeta" },
    },
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];
