import { previewConfigOf, resolvePreview } from "./preview.js";
import type { RowLevel } from "./resolveRowChain.js";

export type LabelValue = unknown;

export type Translate = (label: LabelValue) => string;

const MAX_TITLE_LENGTH = 48;

export const humanize = (name: string): string =>
  name
    .replaceAll(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replaceAll(/[-_]+/gu, " ")
    .trim()
    .replace(/^./u, (first) => first.toUpperCase());

const translateRecord = (
  record: Record<string, unknown>,
  language: string,
  fallbackLanguage: string | false
): string => {
  const fallback = fallbackLanguage === false ? undefined : record[fallbackLanguage];
  const picked = record[language] ?? fallback ?? Object.values(record)[0];
  return typeof picked === "string" ? picked : "";
};

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
      return translateRecord(label as Record<string, unknown>, language, fallbackLanguage);
    }
    return "";
  };

export const padRowNumber = (rowIndex: number): string => String(rowIndex + 1).padStart(2, "0");

const truncate = (text: string): string =>
  text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1)}…` : text;

export const fieldLabelOf = (level: RowLevel, translate: Translate): string =>
  translate(level.field.label) || humanize(level.field.name);

export const rowTypeLabelOf = (level: RowLevel, translate: Translate): string =>
  level.block
    ? translate(level.block.labels?.singular) || humanize(level.block.slug)
    : translate(level.field.labels?.singular) || "Row";

export const blockLabelOf = (level: RowLevel, translate: Translate): string | undefined =>
  level.block ? translate(level.block.labels?.singular) || level.block.slug : undefined;

export const rowLabelOf = (
  level: RowLevel,
  translate: Translate,
  getValue: (path: string) => unknown,
  getRowCount?: (path: string) => number | undefined
): { label: string; title?: string } => {
  const label = `${rowTypeLabelOf(level, translate)} ${padRowNumber(level.rowIndex)}`;
  const select = previewConfigOf(level)?.select;
  const { title } = resolvePreview({
    fields: level.fields,
    getRowCount: (relative) => getRowCount?.(`${level.rowPath}.${relative}`),
    getValue: (relative) => getValue(`${level.rowPath}.${relative}`),
    translate,
    withBlockName: Boolean(level.block),
    ...(select ? { select } : {}),
  });
  return title ? { label, title: truncate(title) } : { label };
};
