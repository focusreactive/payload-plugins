interface StatsProps {
  items: { value: string; label: string }[];
}

export function Stats({ items }: StatsProps) {
  if (!items.length) return null;

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 md:gap-y-12">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:gap-4 md:text-left"
        >
          <div className="flex flex-1 flex-col-reverse gap-1">
            <dt className="text-lg font-semibold text-primary">{item.label}</dt>
            <dd className="text-display-lg font-semibold text-brand-tertiary_alt">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
