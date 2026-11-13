import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "../../../translations/types";

export type TabKey = "overview" | "keyphrase" | "content" | "links";

export interface Tab {
  key: TabKey;
  labelKey: TranslationKey;
  icon: LucideIcon;
}
