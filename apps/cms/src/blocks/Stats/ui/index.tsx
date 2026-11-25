interface StatsProps {
  items: { value: string; label: string }[];
}

export function Stats({ items }: StatsProps) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-1 gap-gridGap sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex flex-col gap-6 rounded-2xl border border-border-strong p-8 glass md:p-10"
        >
          <div className="text-h-stat text-foreground tabular-nums hyphens-auto break-words">
            {item.value}
          </div>
          <div className="text-body text-muted-foreground hyphens-auto break-words">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
