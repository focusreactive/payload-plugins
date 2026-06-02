import type { LucideIcon } from "lucide-react";
import type { MetricMode, MetricTone } from "./types";

import { deriveTone } from "./utils/deriveTone";
import { metricModeComponents } from "./components/modes";

export interface MetricProps {
  value: number;
  prevValue?: number | null;
  format: (n: number) => string;
  icon?: LucideIcon;
  invertDelta?: boolean;
  mode?: MetricMode;
}

export function Metric({ value, prevValue, format, icon, invertDelta = false, mode = "inline" }: MetricProps) {
  const hasPrev = prevValue != null;
  const tone: MetricTone | null = hasPrev ? deriveTone(value, prevValue, invertDelta) : null;
  const formattedValue = format(value);
  const formattedPrev = hasPrev ? format(prevValue) : null;

  const ModeComponent = metricModeComponents[mode];

  return <ModeComponent formattedValue={formattedValue} formattedPrev={formattedPrev} tone={tone} icon={icon} />;
}
