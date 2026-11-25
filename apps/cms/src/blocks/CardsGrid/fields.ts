import { definePreview } from "@focus-reactive/payload-plugin-stacked-editing";
import type { Field } from "payload";

import { imageField } from "@/lib/fields/imageField";
import { ALL_APPEARANCES, link } from "@/lib/fields/link";

import { CARD_ICONS } from "./icons";

/** Layouts the grid component supports (`ui/index.tsx` maps each to a `lg:grid-cols-*`). */
export const CARDS_GRID_COLUMNS = ["1", "2", "3", "4"] as const;

/** How the grid looks: cards per row, alignment, card background. */
export const cardsGridLookFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: {
          description: {
            en: "On wide screens. Phones always show one card per row.",
            es: "En pantallas anchas. En móviles siempre se muestra una tarjeta por fila.",
          },
          width: "33%",
        },
        defaultValue: "3",
        label: { en: "Cards per row", es: "Tarjetas por fila" },
        name: "columns",
        options: CARDS_GRID_COLUMNS.map((value) => ({ label: value, value })),
        type: "select",
      },
      {
        admin: { width: "33%" },
        defaultValue: "left",
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
        // The redesigned cards are always rounded, so this choice changes nothing on the site:
        // hidden from editors, still stored for a design that uses it again.
        admin: { hidden: true },
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
        admin: { width: "33%" },
        defaultValue: "none",
        label: { en: "Card background", es: "Fondo de las tarjetas" },
        name: "backgroundColor",
        options: [
          // "light" looked the same as "none" (glass) after the redesign and is no longer offered.
          { label: { en: "Glass", es: "Cristal" }, value: "none" },
          { label: { en: "Frosted glass", es: "Cristal esmerilado" }, value: "light-gray" },
          { label: { en: "Black", es: "Negro" }, value: "dark" },
          { label: { en: "Soft black", es: "Negro suave" }, value: "dark-gray" },
          { label: { en: "Brand gradient", es: "Degradado de marca" }, value: "gradient-2" },
        ],
        type: "select",
      },
    ],
  },
];

/** The cards themselves: title first, then icon, text, image and link. */
export const cardsGridItemsField: Field = {
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
          admin: { width: "60%" },
          label: { en: "Title", es: "Título" },
          localized: true,
          name: "title",
          required: true,
          type: "text",
        },
        {
          admin: { width: "40%" },
          label: { en: "Icon", es: "Icono" },
          name: "icon",
          options: CARD_ICONS.map((icon) => ({ label: icon, value: icon })),
          type: "select",
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
    link({ appearances: ALL_APPEARANCES, required: false }),
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
};

/** Cards inside post text (no tabs there): the cards first, how they look after. */
export const cardsGridFields: Field[] = [cardsGridItemsField, ...cardsGridLookFields];
