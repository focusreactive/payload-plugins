import { cn } from "../../../utils/style";

export interface MetricSwitcherProps<V extends string> {
  value: V;
  onChange: (v: V) => void;
  options: Array<{ value: V; label: string }>;
}

export function MetricSwitcher<V extends string>({ value: metricValue, onChange, options }: MetricSwitcherProps<V>) {
  return (
    <div className="inline-flex bg-[var(--theme-elevation-100)] rounded-[var(--style-radius-s)] p-0.5">
      {options.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "px-2.5 py-1 rounded text-xs font-medium",
            metricValue === value ?
              "bg-[var(--theme-elevation-0)] text-[var(--theme-elevation-1000)] shadow-sm"
            : "text-[var(--theme-elevation-500)] hover:text-[var(--theme-elevation-800)]",
          )}>
          {label}
        </button>
      ))}
    </div>
  );
}
