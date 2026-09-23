import { AnimatedStatValue } from "@/components/demo/AnimatedStatValue";

interface StatsProps {
  items: { value: string; label: string }[];
}

/**
 * The numbers sit directly on the section background. A raised panel inside an alternating grey
 * section read as two competing backgrounds. Items align to the top so a label that wraps to two
 * lines does not lift its number above the others.
 */
export function Stats({ items }: StatsProps) {
  if (!items.length) return null;

  return (
    <dl className="flex flex-col gap-10 md:flex-row md:items-start md:gap-8">
      {items.map((item, index) => (
        <div key={index} className="flex flex-1 flex-col-reverse justify-end gap-3 text-center">
          <dt className="text-lg font-semibold text-balance text-primary">{item.label}</dt>
          <dd
            className={
              /\d/u.test(item.value)
                ? "flex items-center justify-center text-display-lg font-semibold text-brand-tertiary_alt md:h-18 md:text-display-xl"
                : // A word at display-xl wraps and dwarfs the figures beside it. The shared md:h-18
                  // keeps every label on one line across the row whatever size its value is.
                  "flex items-center justify-center text-display-sm font-semibold text-brand-tertiary_alt md:h-18 md:text-display-md"
            }
          >
            <AnimatedStatValue value={item.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
