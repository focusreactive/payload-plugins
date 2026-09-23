import { AnimatedStatValue } from "@/components/demo/AnimatedStatValue";

interface StatsProps {
  items: { value: string; label: string }[];
}

/**
 * Untitled UI's metrics-card-gray-light: the numbers sit on one raised panel rather than floating
 * on the section background. The panel uses surface-raised instead of their bg-secondary because
 * sections here alternate onto that same grey, which would make the panel invisible.
 */
export function Stats({ items }: StatsProps) {
  if (!items.length) return null;

  return (
    <dl className="flex flex-col gap-8 bg-surface-raised px-6 py-10 ring-1 ring-secondary_alt md:flex-row md:p-16">
      {items.map((item, index) => (
        <div key={index} className="flex flex-1 flex-col-reverse gap-3 text-center">
          <dt className="text-lg font-semibold text-balance text-primary">{item.label}</dt>
          <dd className="text-display-lg font-semibold text-brand-tertiary_alt md:text-display-xl">
            <AnimatedStatValue value={item.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
