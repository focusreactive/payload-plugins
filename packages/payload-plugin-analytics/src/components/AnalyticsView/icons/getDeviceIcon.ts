import { Monitor, Smartphone, Tablet, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DeviceCategory } from "../../../types/query";

const MAP: Record<DeviceCategory, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  other: HelpCircle,
};

export function getDeviceIcon(cat: DeviceCategory): LucideIcon {
  return MAP[cat] ?? HelpCircle;
}
