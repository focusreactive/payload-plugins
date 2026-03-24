"use client";

import { useImperativeHandle, type ReactNode, type RefObject } from "react";
import { ChevronDown } from "lucide-react";
import { cva } from "class-variance-authority";
import { useCollapseState } from "../hooks/useCollapseState";
import { cn } from "../../../utils/general/cn";

export interface CollapsibleGroupHandle {
  open: () => void;
  toggle: () => void;
}

interface CollapsibleGroupProps {
  groupKey: string;
  label: string;
  children: ReactNode;
  level: "collection" | "document" | "field";
  ref?: RefObject<CollapsibleGroupHandle | null>;
}

const collapsibleGroupVariants = {
  wrapper: cva("flex w-full items-center gap-2 cursor-pointer select-none", {
    variants: {
      level: {
        collection: "py-2",
        document: "py-2",
        field: "py-1.5",
      },
    },
  }),
  label: cva("flex-1 truncate", {
    variants: {
      level: {
        collection: "text-[14px] font-semibold text-(--theme-text)",
        document: "text-[13px] font-semibold text-(--theme-text)",
        field: "text-[12px] font-medium text-(--theme-elevation-600)",
      },
    },
  }),
  childWrapper: cva("", {
    variants: {
      level: {
        collection: "border-l-2 border-(--theme-elevation-100) pl-3",
        document: "border-l-2 border-(--theme-elevation-100) pl-3",
        field: "",
      },
    },
  }),
};

export function CollapsibleGroup({ groupKey, label, children, level, ref }: CollapsibleGroupProps) {
  const [isCollapsed, toggle, open] = useCollapseState(groupKey);

  useImperativeHandle(ref, () => ({
    open,
    toggle,
  }));

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
        aria-expanded={!isCollapsed}
        className={collapsibleGroupVariants.wrapper({ level })}>
        <span className={collapsibleGroupVariants.label({ level })}>{label}</span>

        <ChevronDown
          className={cn(
            "shrink-0 w-4 h-4 text-(--theme-elevation-450) transition-transform duration-150",
            isCollapsed && "-rotate-90",
          )}
        />
      </div>

      {!isCollapsed && <div className={collapsibleGroupVariants.childWrapper({ level })}>{children}</div>}
    </div>
  );
}
