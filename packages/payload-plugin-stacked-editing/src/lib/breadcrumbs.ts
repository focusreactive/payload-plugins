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
