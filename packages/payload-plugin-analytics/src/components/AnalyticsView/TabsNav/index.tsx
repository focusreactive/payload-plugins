"use client";

import { LayoutDashboard, Zap, Footprints, FlaskConical } from "lucide-react";
import { cn } from "../../../utils/style";
import type { AnalyticsTab } from "../hooks/useAnalyticsParams";
import { formatNumber } from "../numberFormatters";

interface Tab {
  value: AnalyticsTab;
  label: string;
  icon: typeof LayoutDashboard;
  countKey?: "leads" | "sessions";
}

const TABS: Tab[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "lead-actions", label: "Lead Actions", icon: Zap, countKey: "leads" },
  { value: "sessions", label: "Sessions", icon: Footprints, countKey: "sessions" },
];

export interface TabsNavProps {
  active: AnalyticsTab;
  onChange: (next: AnalyticsTab) => void;
  counts?: { leads?: number; sessions?: number };
  abEnabled?: boolean;
}

export function TabsNav({ active, onChange, counts, abEnabled }: TabsNavProps) {
  const tabs: Tab[] = abEnabled ? [...TABS, { value: "ab", label: "A/B", icon: FlaskConical }] : TABS;

  return (
    <nav className="flex items-center border-b border-(--theme-border-color) mb-5" role="tablist">
      {tabs.map(({ icon: Icon, label, value, countKey }) => {
        const isActive = active === value;
        const count = countKey ? counts?.[countKey] : undefined;

        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(value)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2.5 text-sm -mb-px border-b-2 bg-transparent",
              isActive ? "text-(--theme-elevation-1000) border-(--theme-elevation-1000) font-medium" : "text-(--theme-elevation-500) border-transparent hover:text-(--theme-elevation-800)"
            )}
          >
            <Icon size={14} />

            <span>{label}</span>

            {count != null && (
              <span
                className={cn(
                  "font-[family-name:var(--font-mono)] text-[10px] font-medium px-1.5 rounded",
                  isActive ? "bg-(--theme-elevation-1000) text-(--theme-elevation-0)" : "bg-(--theme-elevation-100) text-(--theme-elevation-700)"
                )}
              >
                {formatNumber(count)}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
