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

export const rowTypeLabelOf = (level: RowLevel, translate: Translate): string =>
  level.block
    ? translate(level.block.labels?.singular) || humanize(level.block.slug)
    : translate(level.field.labels?.singular) || "Row";

export const rowLabelOf = (
  level: RowLevel,
  translate: Translate,
  getValue: (path: string) => unknown,
  getRowCount?: (path: string) => number | undefined
): { label: string; title?: string } => {
  const label = `${rowTypeLabelOf(level, translate)} ${pad(level.rowIndex)}`;
  const { title } = resolvePreview({
    fields: level.fields,
    getRowCount: (relative) => getRowCount?.(`${level.rowPath}.${relative}`),
    getValue: (relative) => getValue(`${level.rowPath}.${relative}`),
    translate,
    withBlockName: Boolean(level.block),
    ...(previewConfigOf(level) ? { select: previewConfigOf(level)?.select } : {}),
  });
  return title ? { label, title: truncate(title) } : { label };
};

export type Crumb = {
  readonly key: string;
  readonly label: string;
  readonly kind: "document" | "field" | "row";
  readonly keep: number;
  readonly current: boolean;
  readonly level: number;
  readonly hint?: string;
};

export type CrumbLevel = {
  readonly rowPath: string;
  readonly fieldLabel: string;
  readonly rowLabel: string;
  readonly rowHint?: string;
};

const hintFor = (level: CrumbLevel): string | undefined =>
  level.rowHint && !level.rowLabel.toLowerCase().includes(level.rowHint.toLowerCase())
    ? level.rowHint
    : undefined;

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
      },
      {
        key: `${level.rowPath}:row`,
        label: level.rowLabel,
        kind: "row",
        keep: index + 1,
        current: index === depth,
        level: index * 2 + 2,
        ...(hintFor(level) ? { hint: hintFor(level) } : {}),
      }
    );
  }
  return crumbs;
};

export type CrumbFit = {
  readonly visible: number[];
  readonly hidden: number[];
};

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from) }, (_, offset) => from + offset);

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
