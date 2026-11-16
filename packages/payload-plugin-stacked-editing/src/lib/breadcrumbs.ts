import type { ClientField } from "payload";

import type { RowLevel } from "./resolveRowChain.js";

/** Payload client labels: a string, a per-language record, a `({ t, i18n }) => string`, or `false`. */
export type LabelValue = unknown;

export type Translate = (label: LabelValue) => string;

/** Fields whose value reads like a row title, checked in order when a row has no block name. */
export const TITLE_FIELD_NAMES = ["title", "name", "label", "heading", "headline"] as const;

const MAX_TITLE_LENGTH = 48;

export const humanize = (name: string): string =>
  name
    .replaceAll(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replaceAll(/[-_]+/gu, " ")
    .trim()
    .replace(/^./u, (first) => first.toUpperCase());

/**
 * Turns any Payload label shape into a string. `language` / `fallbackLanguage` pick from a
 * per-language record; `t` is passed through to label functions.
 */
export const createTranslate =
  ({
    fallbackLanguage = "en",
    language = "en",
    t,
  }: {
    fallbackLanguage?: string | false;
    language?: string;
    t?: (key: string) => string;
  }): Translate =>
  (label) => {
    if (typeof label === "string") {
      return label;
    }
    if (typeof label === "function") {
      const result: unknown = label({ i18n: { language, fallbackLanguage }, t });
      return typeof result === "string" ? result : "";
    }
    if (typeof label === "object" && label !== null) {
      const record = label as Record<string, unknown>;
      const fallback = fallbackLanguage === false ? undefined : record[fallbackLanguage];
      const picked = record[language] ?? fallback ?? Object.values(record)[0];
      return typeof picked === "string" ? picked : "";
    }
    return "";
  };

const pad = (rowIndex: number): string => String(rowIndex + 1).padStart(2, "0");

const truncate = (text: string): string =>
  text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1)}…` : text;

export const fieldLabelOf = (level: RowLevel, translate: Translate): string =>
  translate(level.field.label) || humanize(level.field.name);

const hasNamedField = (fields: ClientField[], name: string): boolean =>
  fields.some((field) => "name" in field && field.name === name);

/**
 * How a row is called in the breadcrumbs: the block (or array item) label and its 1-based number —
 * the same `Hero 01` Payload shows in the row header — plus a title when the row has one: the
 * block's `blockName`, or the value of a title-like text field (`title`, `name`, `label`, …).
 */
export const rowLabelOf = (
  level: RowLevel,
  translate: Translate,
  getValue: (path: string) => unknown
): { label: string; title?: string } => {
  const kind = level.block
    ? translate(level.block.labels?.singular) || humanize(level.block.slug)
    : translate(level.field.labels?.singular) || "Row";
  const label = `${kind} ${pad(level.rowIndex)}`;

  const candidates = [
    ...(level.block ? ["blockName"] : []),
    ...TITLE_FIELD_NAMES.filter((name) => hasNamedField(level.fields, name)),
  ];
  for (const name of candidates) {
    const value = getValue(`${level.rowPath}.${name}`);
    if (typeof value === "string" && value.trim()) {
      return { label, title: truncate(value.trim()) };
    }
  }
  return { label };
};

export type Crumb = {
  readonly key: string;
  readonly label: string;
  readonly kind: "document" | "field" | "row";
  /** How many panels stay open when this crumb is clicked (`0` closes them all). */
  readonly keep: number;
  readonly current: boolean;
};

export type CrumbLevel = {
  readonly rowPath: string;
  readonly fieldLabel: string;
  readonly rowLabel: string;
};

/**
 * `Document › Layout › Deep Nest 01 › Nested › Inner 02 …` for the panel at `depth`.
 *
 * A row crumb reopens that row's panel (closing everything above it); a field crumb goes back to
 * the panel the field lives in — the row above it, or the document for a top-level field.
 */
export const buildBreadcrumbs = ({
  documentTitle,
  levels,
  depth = levels.length - 1,
}: {
  documentTitle: string;
  levels: readonly CrumbLevel[];
  depth?: number;
}): Crumb[] => {
  const crumbs: Crumb[] = [
    { key: "document", label: documentTitle, kind: "document", keep: 0, current: false },
  ];
  for (const [index, level] of levels.slice(0, depth + 1).entries()) {
    crumbs.push(
      {
        key: `${level.rowPath}:field`,
        label: level.fieldLabel,
        kind: "field",
        keep: index,
        current: false,
      },
      {
        key: `${level.rowPath}:row`,
        label: level.rowLabel,
        kind: "row",
        keep: index + 1,
        current: index === depth,
      }
    );
  }
  return crumbs;
};
