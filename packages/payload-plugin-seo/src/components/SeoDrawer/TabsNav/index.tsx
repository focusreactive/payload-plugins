"use client";

import type { Tab, TabKey } from "./types";
import { tabVariants } from "./variants";
import { statusVar } from "../variants";
import { STATUS_LABEL_KEY } from "../../../constants";
import type { Status } from "../../../engine/types/analysis";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";
import { cn } from "../../../utils/style";

export { TABS, TABS_WITH_LINKS } from "./constants";
export type { TabKey } from "./types";

export interface TabsNavProps {
  active: TabKey;
  onChange: (next: TabKey) => void;
  tabs: readonly Tab[];
  statuses?: Partial<Record<TabKey, Status>>;
}

export function TabsNav({ active, onChange, tabs, statuses }: TabsNavProps) {
  const { t } = useSeoTranslation();
  return (
    <nav
      role="tablist"
      className="flex shrink-0 gap-[20px] border-b border-neutral-200 overflow-x-auto"
    >
      {tabs.map(({ key, labelKey, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          className={tabVariants({ active: active === key })}
          onClick={() => onChange(key)}
        >
          <Icon size={14} aria-hidden="true" />
          <span>{t(labelKey)}</span>
          {statuses?.[key] && statuses[key] !== "good" && (
            <span
              className={cn(
                "w-[6px] h-[6px] rounded-full bg-(--seo-c)",
                statusVar({ status: statuses[key] })
              )}
              role="img"
              aria-label={t(STATUS_LABEL_KEY[statuses[key]])}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
