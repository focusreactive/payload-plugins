"use client";

import { TABS } from "./constants";
import type { Tab, TabKey } from "./types";
import { tabVariants } from "./variants";

export { TABS, TABS_WITH_LINKS } from "./constants";
export type { Tab, TabKey } from "./types";

export interface TabsNavProps {
  active: TabKey;
  onChange: (next: TabKey) => void;
  tabs?: readonly Tab[];
}

export function TabsNav({ active, onChange, tabs = TABS }: TabsNavProps) {
  return (
    <nav
      role="tablist"
      className="flex shrink-0 gap-[20px] border-b border-neutral-200 overflow-x-auto"
    >
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          className={tabVariants({ active: active === key })}
          onClick={() => onChange(key)}
        >
          <Icon size={14} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
