interface StatsProps {
  items: { value: string; label: string }[];
}

/** §6.7: 4-up (2×2 on mobile), mono values in the heading colour, a hairline rule above each cell. */
export function Stats({ items }: StatsProps) {
  if (!items.length) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col-reverse gap-2 border-t-2 border-highlight pt-5">
          <dt className="text-small text-muted-foreground">{item.label}</dt>
          <dd className="font-mono text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium leading-tight text-heading tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
