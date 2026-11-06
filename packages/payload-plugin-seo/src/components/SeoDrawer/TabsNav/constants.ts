import type { Tab } from "./types";
import { BarChart3, BookOpen, Crosshair, FileText, Link2, Search, Users } from "lucide-react";

export const TABS: readonly Tab[] = [
  { key: "keyphrase", label: "Keyphrase", icon: Crosshair },
  { key: "onpage", label: "On-page SEO", icon: FileText },
  { key: "readability", label: "Readability", icon: BookOpen },
  { key: "inclusive", label: "Inclusive", icon: Users },
  { key: "vitals", label: "Content vitals", icon: BarChart3 },
  { key: "serp", label: "Search result preview", icon: Search },
];

export const TABS_WITH_LINKS: readonly Tab[] = [
  ...TABS,
  { key: "links", label: "Internal links", icon: Link2 },
];
