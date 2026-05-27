import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { MetricMode, MetricTone } from "../../types";
import { InlineMode } from "./InlineMode";
import { ChipMode } from "./ChipMode";
import { LargeMode } from "./LargeMode";

export interface MetricModeProps {
  formattedValue: string;
  formattedPrev: string | null;
  tone: MetricTone | null;
  icon?: LucideIcon;
}

export const metricModeComponents: Record<MetricMode, ComponentType<MetricModeProps>> = {
  inline: InlineMode,
  chip: ChipMode,
  large: LargeMode,
};
