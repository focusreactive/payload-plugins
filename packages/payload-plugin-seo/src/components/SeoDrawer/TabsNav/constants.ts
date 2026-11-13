import type { Tab } from "./types";
import { BarChart3, Crosshair, LayoutList, Link2 } from "lucide-react";

export const TABS: readonly Tab[] = [
  { key: "overview", labelKey: "tab.overview", icon: LayoutList },
  { key: "keyphrase", labelKey: "tab.keyphrase", icon: Crosshair },
  { key: "content", labelKey: "tab.vitals", icon: BarChart3 },
];

export const TABS_WITH_LINKS: readonly Tab[] = [
  ...TABS,
  { key: "links", labelKey: "tab.links", icon: Link2 },
];
