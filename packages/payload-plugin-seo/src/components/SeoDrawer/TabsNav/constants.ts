import type { Tab } from "./types";
import { BarChart3, BookOpen, Crosshair, FileText, Search, Users } from "lucide-react";

export const TABS: Tab[] = [
  { key: "keyphrase", label: "Keyphrase", icon: Crosshair },
  { key: "onpage", label: "On-page SEO", icon: FileText },
  { key: "readability", label: "Readability", icon: BookOpen },
  { key: "inclusive", label: "Inclusive", icon: Users },
  { key: "vitals", label: "Content vitals", icon: BarChart3 },
  { key: "serp", label: "Search result preview", icon: Search },
];
