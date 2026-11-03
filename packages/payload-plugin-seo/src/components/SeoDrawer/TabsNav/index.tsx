"use client";

import { TABS } from "./constants";
import type { TabKey } from "./types";
import { tabVariants } from "./variants";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";

export type { TabKey } from "./types";

export interface TabsNavProps {
  active: TabKey;
  onChange: (next: TabKey) => void;
}

export function TabsNav({ active, onChange }: TabsNavProps) {
  const { t } = useSeoTranslation();
  return (
    <nav
      role="tablist"
      className="flex shrink-0 gap-[20px] border-b border-neutral-200 overflow-x-auto"
    >
      {TABS.map(({ key, labelKey, icon: Icon }) => (
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
        </button>
      ))}
    </nav>
  );
}
