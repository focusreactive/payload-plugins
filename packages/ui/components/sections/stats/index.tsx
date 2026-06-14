interface StatsProps {
  items: { value: string; label: string }[];
}

export function Stats({ items }: StatsProps) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 gap-y-9 md:grid-cols-4 md:gap-y-0">
      {items.map((item, i) => (
        <div key={i} className={["px-[clamp(16px,3vw,34px)] py-2 text-center", "md:border-l md:border-border md:first:border-l-0", i % 2 === 0 ? "border-l-0" : "border-l border-border"].join(" ")}>
          <div className="text-display-2 text-primary tabular-nums">{item.value}</div>
          <div className="text-small text-muted-foreground mt-2.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
