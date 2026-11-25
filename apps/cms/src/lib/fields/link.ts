import type { ArrayField, Condition, Field, GroupField, Option } from "payload";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { CUSTOM_PAGES_CONFIG } from "@/lib/config/customPages";
import type { CustomPageKey } from "@/lib/config/customPages";

/**
 * The one link field of the CMS. Every stored link (buttons, cards, logos, menus, footer
 * columns) is a `link` group built here, so every link in the admin has the same fields in the
 * same order with the same labels:
 *
 *   Link text (only where needed)            · Button style (buttons only)
 *   Link to: Page or post / Web address (URL) / Built-in page
 *   the chosen destination (page or post picker, web address or built-in page)
 *   Open in new tab
 *
 * Stored shape: `{ link: { type, newTab, reference, url, customPage, label?, appearance? } }`.
 * Rows of a "Buttons" list come from `buttonsField()`, which wraps this group in an array.
 */

export type LinkType = "reference" | "custom" | "customPage";

export type LinkAppearances = "default" | "outline" | "accent" | "ghost" | "link";

export const appearanceOptions: Record<LinkAppearances, Option> = {
  default: {
    label: {
      en: "Primary (glass + glow)",
      es: "Primario (cristal + resplandor)",
    },
    value: "default",
  },
  outline: {
    label: { en: "Secondary (outline)", es: "Secundario (contorno)" },
    value: "outline",
  },
  accent: {
    label: {
      en: "Accent (gradient)",
      es: "Acento (degradado)",
    },
    value: "accent",
  },
  ghost: {
    label: { en: "Subtle (no background)", es: "Sutil (sin fondo)" },
    value: "ghost",
  },
  link: {
    label: { en: "Text link", es: "Enlace de texto" },
    value: "link",
  },
};

export const ALL_APPEARANCES: LinkAppearances[] = ["default", "outline", "accent", "ghost", "link"];

export interface LinkFieldOptions {
  /** "Button style" choices; `false` (the default) for plain links such as menu or footer links. */
  appearances?: LinkAppearances[] | false;
  /** Shows the group only when this returns true (e.g. a menu item that opens a link). */
  condition?: Condition;
  /** Short `dbName` for the built-in page select where the derived enum name would pass 63 chars. */
  customPageDbName?: string;
  /** Heading above the link; `false` inside rows that already are the link (a "Buttons" row). */
  label?: GroupField["label"];
  /** Ticks "Open in new tab" for new links (e.g. social profiles). Default: false. */
  newTabByDefault?: boolean;
  /** Whether the destination (and the link text, when shown) must be filled in. */
  required?: boolean;
  /**
   * "Link to" choices, in this order. With a single choice the picker is hidden (e.g. social
   * profiles, which are always a web address). Default: page or post, web address, built-in page.
   */
  types?: readonly LinkType[];
  /** Adds the "Link text" field. Off where the surrounding row already has the visible text. */
  withText?: boolean;
}

const LINK_TYPE_LABELS: Record<LinkType, Record<"en" | "es", string>> = {
  custom: { en: "Web address (URL)", es: "Dirección web (URL)" },
  customPage: { en: "Built-in page", es: "Página integrada" },
  reference: { en: "Page or post", es: "Página o publicación" },
};

const ALL_LINK_TYPES: readonly LinkType[] = ["reference", "custom", "customPage"];

const isType = (type: string) => (_: unknown, siblingData: { type?: string } | undefined) =>
  siblingData?.type === type;

export function link({
  appearances = false,
  condition,
  customPageDbName,
  label = { en: "Link", es: "Enlace" },
  newTabByDefault = false,
  required = true,
  types = ALL_LINK_TYPES,
  withText = true,
}: LinkFieldOptions = {}): GroupField {
  const destinationByType: Record<LinkType, Field> = {
    reference: {
      admin: { condition: isType("reference") },
      label: LINK_TYPE_LABELS.reference,
      name: "reference",
      relationTo: ["page", BLOG_CONFIG.collection],
      required,
      type: "relationship",
    },
    custom: {
      admin: { condition: isType("custom"), placeholder: "https://" },
      label: LINK_TYPE_LABELS.custom,
      name: "url",
      required,
      type: "text",
    },
    customPage: {
      admin: { condition: isType("customPage") },
      ...(customPageDbName ? { dbName: customPageDbName } : {}),
      label: LINK_TYPE_LABELS.customPage,
      name: "customPage",
      options: Object.entries(CUSTOM_PAGES_CONFIG).map(([key, entry]) => ({
        label: entry.label,
        value: key as CustomPageKey,
      })),
      required,
      type: "select",
    },
  };
  const destination = types.map((type) => destinationByType[type]);

  const sideBySide = withText && appearances !== false ? { width: "50%" } : {};

  const text: Field[] = withText
    ? [
        {
          admin: sideBySide,
          label: { en: "Link text", es: "Texto del enlace" },
          localized: true,
          name: "label",
          required,
          type: "text",
        },
      ]
    : [];

  const style: Field[] =
    appearances === false
      ? []
      : [
          {
            admin: sideBySide,
            defaultValue: "default",
            label: { en: "Button style", es: "Estilo del botón" },
            name: "appearance",
            options: appearances.map((appearance) => appearanceOptions[appearance]),
            type: "select",
          },
        ];

  // What the visitor sees first (text, style), then where it goes.
  const visible: Field[] =
    text.length > 0 && style.length > 0
      ? [{ fields: [...text, ...style], type: "row" }]
      : [...text, ...style];

  const linkTo: Field = {
    admin: { hidden: types.length === 1, layout: "horizontal" },
    defaultValue: types[0],
    label: { en: "Link to", es: "Enlazar a" },
    name: "type",
    options: types.map((type) => ({ label: LINK_TYPE_LABELS[type], value: type })),
    type: "radio",
  };

  const newTab: Field = {
    ...(newTabByDefault ? { defaultValue: true } : {}),
    label: { en: "Open in new tab", es: "Abrir en una nueva pestaña" },
    name: "newTab",
    type: "checkbox",
  };

  return {
    admin: {
      hideGutter: true,
      ...(condition ? { condition } : {}),
    },
    fields: [...visible, linkTo, ...destination, newTab],
    label,
    name: "link",
    type: "group",
  };
}

export interface ButtonsFieldOptions {
  appearances?: LinkAppearances[];
  defaultValue?: ArrayField["defaultValue"];
  maxRows?: number;
  minRows?: number;
}

/**
 * A "Buttons" list (hero, text and image, call to action, header…): each row is one standard
 * `link` with its text and button style. Rows are titled with the button text.
 */
export function buttonsField({
  appearances = ALL_APPEARANCES,
  defaultValue,
  maxRows,
  minRows,
}: ButtonsFieldOptions = {}): ArrayField {
  return {
    admin: {
      components: {
        RowLabel: {
          clientProps: { titleField: "link.label" },
          path: "@/components/admin/RowLabel#RowLabel",
        },
      },
      initCollapsed: true,
    },
    fields: [link({ appearances, label: false })],
    label: { en: "Buttons", es: "Botones" },
    labels: {
      plural: { en: "Buttons", es: "Botones" },
      singular: { en: "Button", es: "Botón" },
    },
    localized: true,
    name: "actions",
    type: "array",
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    ...(maxRows !== undefined ? { maxRows } : {}),
    ...(minRows !== undefined ? { minRows, required: minRows > 0 } : {}),
  };
}

/** A plain list of text links (footer columns, legal links): rows are titled with the link text. */
export const linkListRowLabel = {
  clientProps: { titleField: "link.label" },
  path: "@/components/admin/RowLabel#RowLabel",
};
