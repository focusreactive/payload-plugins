"use client";

import { useImperativeHandle } from "react";
import type { ReactNode, RefObject } from "react";
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
  fieldPath?: string;
  label: string;
  count?: number;
  children: ReactNode;
  level: "collection" | "document" | "field";
  ref?: RefObject<CollapsibleGroupHandle | null>;
}

const collapsibleGroupVariants = {
  container: cva("", {
    variants: {
      level: {
        collection: "",
        document: "",
        field:
          "rounded-(--style-radius-m) border border-(--theme-elevation-150) bg-(--theme-elevation-0)",
      },
    },
  }),
  wrapper: cva(
    "flex w-full items-center gap-2 cursor-pointer select-none rounded-(--style-radius-m) focus-visible:outline-2 focus-visible:outline-(--theme-elevation-800)",
    {
      variants: {
        level: {
          collection: "py-2",
          document: "py-2",
          field: "px-3 py-2.5",
        },
      },
    }
  ),
  label: cva("flex-1 truncate", {
    variants: {
      level: {
        collection: "text-[14px] font-semibold text-(--theme-text)",
        document: "text-[13px] font-semibold text-(--theme-text)",
        field: "text-[13px] font-medium text-(--theme-elevation-800)",
      },
    },
  }),
  childWrapper: cva("", {
    variants: {
      level: {
        collection: "border-l-2 border-(--theme-elevation-100) pl-3",
        document: "border-l-2 border-(--theme-elevation-100) pl-3",
        field: "px-3 pb-3",
      },
    },
  }),
};

export function CollapsibleGroup({
  groupKey,
  fieldPath,
  label,
  count,
  children,
  level,
  ref,
}: CollapsibleGroupProps) {
  const [isCollapsed, toggle, open] = useCollapseState(groupKey);

  useImperativeHandle(ref, () => ({
    open,
    toggle,
  }));

  return (
    <div
      data-field-path={fieldPath ?? null}
      className={collapsibleGroupVariants.container({ level })}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
        aria-expanded={!isCollapsed}
        className={collapsibleGroupVariants.wrapper({ level })}
      >
        <span className={collapsibleGroupVariants.label({ level })}>{label}</span>

        {count !== undefined && count > 0 && (
          <span className="text-[12px] text-(--theme-elevation-500) tabular-nums">{count}</span>
        )}

        <ChevronDown
          className={cn(
            "shrink-0 w-4 h-4 text-(--theme-elevation-450) transition-transform duration-150",
            isCollapsed && "-rotate-90"
          )}
        />
      </div>

      {!isCollapsed && (
        <div className={collapsibleGroupVariants.childWrapper({ level })}>{children}</div>
      )}
    </div>
  );
}
