import type { LucideIcon } from "lucide-react";

export type TabKey = "keyphrase" | "onpage" | "readability" | "inclusive" | "vitals" | "serp";

export interface Tab {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}
