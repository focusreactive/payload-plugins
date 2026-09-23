import type { Field } from "payload";

import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { talkKindOptions } from "@/lib/talks/taxonomy";

export const talkGridFields: Field[] = [
  ...sectionHeaderFields({ headingDefault: { en: "Talks", es: "Charlas" } }),
  {
    defaultValue: "recent",
    label: { en: "Which talks", es: "Qué charlas" },
    name: "source",
    options: [
      { label: { en: "Most recent", es: "Más recientes" }, value: "recent" },
      { label: { en: "By topic", es: "Por tema" }, value: "topic" },
      { label: { en: "By kind", es: "Por tipo" }, value: "kind" },
      { label: { en: "Hand-picked", es: "Seleccionadas" }, value: "selected" },
    ],
    required: true,
    type: "select",
  },
  {
    admin: { condition: (_, siblingData) => siblingData?.source === "topic" },
    label: { en: "Topic", es: "Tema" },
    name: "topic",
    relationTo: "topic",
    type: "relationship",
  },
  {
    admin: { condition: (_, siblingData) => siblingData?.source === "kind" },
    label: { en: "Kind", es: "Tipo" },
    name: "kind",
    options: talkKindOptions(),
    type: "select",
  },
  {
    admin: {
      condition: (_, siblingData) => siblingData?.source === "selected",
      initCollapsed: true,
    },
    fields: [
      {
        label: { en: "Talk", es: "Charla" },
        name: "talk",
        relationTo: "talk",
        required: true,
        type: "relationship",
      },
    ],
    label: { en: "Talks", es: "Charlas" },
    name: "talkItems",
    type: "array",
  },
  {
    admin: {
      description: {
        en: "How the cards are arranged. Grid wraps them across as many rows as needed. Rail puts them in one row that scrolls sideways, which suits a short, curated set best.",
        es: "Cómo se organizan las tarjetas. Cuadrícula las reparte en tantas filas como haga falta. Fila las coloca en una sola fila que se desplaza de lado, lo que conviene mejor a un conjunto corto y seleccionado.",
      },
    },
    defaultValue: "grid",
    label: { en: "Layout", es: "Diseño" },
    name: "layout",
    options: [
      { label: { en: "Grid", es: "Cuadrícula" }, value: "grid" },
      { label: { en: "Rail (scrolls sideways)", es: "Fila (se desplaza de lado)" }, value: "rail" },
    ],
    required: true,
    type: "select",
  },
  {
    type: "row",
    fields: [
      {
        admin: { width: "33%" },
        defaultValue: 6,
        label: { en: "How many", es: "Cuántas" },
        max: 24,
        min: 1,
        name: "limit",
        type: "number",
      },
      {
        admin: { width: "33%" },
        defaultValue: true,
        label: { en: "Show kind", es: "Mostrar tipo" },
        name: "showKind",
        type: "checkbox",
      },
      {
        admin: {
          description: {
            en: "Shows a lock and the tier needed. Rows are listed at every tier either way - the gate is on the body, not the listing, so a gated talk stays indexable.",
            es: "Muestra un candado y el nivel necesario.",
          },
          width: "33%",
        },
        defaultValue: true,
        label: { en: "Show tier", es: "Mostrar nivel" },
        name: "showTier",
        type: "checkbox",
      },
    ],
  },
];
