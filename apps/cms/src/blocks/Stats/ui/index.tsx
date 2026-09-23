interface StatsProps {
  items: { value: string; label: string }[];
}

/**
 * A rule above each figure rather than a card around it, per DESIGN.md: a statistic in a coloured
 * box is the single most template-looking element a professional-services page can carry.
 *
 * The tablet tier is normally 2-up; an odd count there strands the last figure alone under its own
 * rule with no partner (three stats renders as a full row of two plus one orphan), which reads as
 * a mistake for a small set. Stack to one column instead when that happens - stats sets are never
 * long enough for a stacked column to look like the wrong choice, unlike a long card list.
 */
export function Stats({ items }: StatsProps) {
  if (!items.length) return null;

  const leavesSmallOrphanAtTablet = items.length > 2 && items.length % 2 === 1;
  const tabletGridCols = leavesSmallOrphanAtTablet ? "sm:grid-cols-1" : "sm:grid-cols-2";

  return (
    <div className={`grid grid-cols-1 gap-10 ${tabletGridCols} lg:grid-cols-4 lg:gap-12`}>
      {items.map((item, i) => (
        <div key={i} className="rule-top pt-6">
          <div className="text-display-2 tabular-nums hyphens-auto break-words">{item.value}</div>
          <div className="text-small text-muted-foreground mt-3 hyphens-auto break-words">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
