import type { Tab } from "./types";
import { BarChart3, BookOpen, Crosshair, FileText, Search, Users } from "lucide-react";

export const TABS: Tab[] = [
  { key: "keyphrase", labelKey: "tab.keyphrase", icon: Crosshair },
  { key: "onpage", labelKey: "tab.onpage", icon: FileText },
  { key: "readability", labelKey: "tab.readability", icon: BookOpen },
  { key: "inclusive", labelKey: "tab.inclusive", icon: Users },
  { key: "vitals", labelKey: "tab.vitals", icon: BarChart3 },
  { key: "serp", labelKey: "tab.serp", icon: Search },
];
