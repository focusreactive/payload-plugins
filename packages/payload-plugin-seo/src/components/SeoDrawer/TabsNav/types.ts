import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "../../../translations/types";

export type TabKey =
  | "keyphrase"
  | "onpage"
  | "readability"
  | "inclusive"
  | "vitals"
  | "serp"
  | "links";

export interface Tab {
  key: TabKey;
  labelKey: TranslationKey;
  icon: LucideIcon;
}
