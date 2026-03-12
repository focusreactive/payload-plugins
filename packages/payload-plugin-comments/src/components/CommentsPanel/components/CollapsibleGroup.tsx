"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useCollapseState } from "../hooks/useCollapseState";

interface CollapsibleGroupProps {
  groupKey: string;
  label: string;
  count: number;
  children: ReactNode;
  level: "collection" | "document" | "field";
}

const levelStyles = {
  collection: {
    wrapper: "py-3 border-b border-gray-200 dark:border-gray-700",
    label: "text-base font-semibold text-gray-900 dark:text-gray-100",
    chevron: 16,
    childWrapper: "mt-2",
  },
  document: {
    wrapper: "py-2",
    label: "text-sm font-semibold text-gray-700 dark:text-gray-300",
    chevron: 14,
    childWrapper: "mt-1",
  },
  field: {
    wrapper: "py-1.5",
    label: "text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide",
    chevron: 12,
    childWrapper: "mt-1",
  },
};

export function CollapsibleGroup({ groupKey, label, count, children, level }: CollapsibleGroupProps) {
  const [isCollapsed, toggle] = useCollapseState(groupKey);
  const styles = levelStyles[level];

  const isFieldLevel = level === "field";

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
        aria-expanded={!isCollapsed}
        className={`flex w-full items-center gap-2 cursor-pointer select-none ${styles.wrapper}`}>
        <span className={`flex-1 truncate ${styles.label}`}>{label}</span>
        {!isFieldLevel && count > 0 && (
          <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium flex items-center justify-center">
            {count}
          </span>
        )}
        <ChevronDown
          size={styles.chevron}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
        />
      </div>
      {!isCollapsed && <div className={styles.childWrapper}>{children}</div>}
    </div>
  );
}
