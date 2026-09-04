/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/lib/fields/talkGridFields.ts
 */

import type { Field } from "payload";

import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { TALK_KINDS } from "@/collections/Talk";

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
    options: TALK_KINDS.map((value) => ({
      label: value.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()),
      value,
    })),
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
