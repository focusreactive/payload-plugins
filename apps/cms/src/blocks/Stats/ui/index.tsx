interface StatsProps {
  items: { value: string; label: string }[];
}

/**
 * A rule above each figure rather than a card around it, per DESIGN.md: a statistic in a coloured
 * box is the single most template-looking element a professional-services page can carry.
 */
export function Stats({ items }: StatsProps) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
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
