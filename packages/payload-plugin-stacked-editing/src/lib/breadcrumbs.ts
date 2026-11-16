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
  /** Nesting level (0 = document), for indenting the hidden-levels menu. */
  readonly level: number;
  /** A short type hint for the hidden-levels menu: "Blocks", "Array", a block or item label. */
  readonly hint?: string;
};

export type CrumbLevel = {
  readonly rowPath: string;
  readonly fieldLabel: string;
  readonly rowLabel: string;
  /** "Blocks" or "Array". */
  readonly fieldHint?: string;
  /** The block label ("Hero") or the array's item label ("Feature"). */
  readonly rowHint?: string;
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
    { key: "document", label: documentTitle, kind: "document", keep: 0, current: false, level: 0 },
  ];
  for (const [index, level] of levels.slice(0, depth + 1).entries()) {
    crumbs.push(
      {
        key: `${level.rowPath}:field`,
        label: level.fieldLabel,
        kind: "field",
        keep: index,
        current: false,
        level: index * 2 + 1,
        ...(level.fieldHint ? { hint: level.fieldHint } : {}),
      },
      {
        key: `${level.rowPath}:row`,
        label: level.rowLabel,
        kind: "row",
        keep: index + 1,
        current: index === depth,
        level: index * 2 + 2,
        ...(level.rowHint ? { hint: level.rowHint } : {}),
      }
    );
  }
  return crumbs;
};

export type CrumbFit = {
  /** Indices of the crumbs shown in the row, in order; an ellipsis goes after the first. */
  readonly visible: number[];
  /** Indices folded into the "…" menu, top to bottom. */
  readonly hidden: number[];
};

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from) }, (_, offset) => from + offset);

/**
 * Which crumbs fit on one line. Every crumb's width includes its separator. When the whole trail
 * does not fit, the first crumb stays, an ellipsis replaces the middle and as many trailing crumbs
 * as fit are kept (`first / … / parent / current`, then `first / … / current`). The current crumb
 * is always kept; if even that does not fit it truncates with an ellipsis (CSS).
 */
export const fitCrumbs = ({
  available,
  ellipsisWidth,
  widths,
}: {
  available: number;
  ellipsisWidth: number;
  widths: readonly number[];
}): CrumbFit => {
  const count = widths.length;
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (count <= 2 || total <= available) {
    return { visible: range(0, count), hidden: [] };
  }
  const first = widths[0] ?? 0;
  for (let kept = count - 2; kept >= 1; kept -= 1) {
    const trailing = widths.slice(count - kept).reduce((sum, width) => sum + width, 0);
    if (first + ellipsisWidth + trailing <= available) {
      return { visible: [0, ...range(count - kept, count)], hidden: range(1, count - kept) };
    }
  }
  return { visible: [0, count - 1], hidden: range(1, count - 1) };
};
