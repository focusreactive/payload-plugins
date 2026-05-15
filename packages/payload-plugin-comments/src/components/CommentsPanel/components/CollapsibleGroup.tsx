"use client";

import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { useImperativeHandle } from 'react';
import type { ReactNode, RefObject } from 'react';

import { cn } from "../../../utils/general/cn";
import { useCollapseState } from "../hooks/useCollapseState";

export interface CollapsibleGroupHandle {
  open: () => void;
  toggle: () => void;
}

interface CollapsibleGroupProps {
  groupKey: string;
  fieldPath?: string;
  label: string;
  children: ReactNode;
  level: "collection" | "document" | "field";
  ref?: RefObject<CollapsibleGroupHandle | null>;
}

const collapsibleGroupVariants = {
  childWrapper: cva("", {
    variants: {
      level: {
        collection: "border-l-2 border-(--theme-elevation-100) pl-3",
        document: "border-l-2 border-(--theme-elevation-100) pl-3",
        field: "",
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
  wrapper: cva("flex w-full items-center gap-2 cursor-pointer select-none", {
    variants: {
      level: {
        collection: "py-2",
        document: "py-2",
        field: "py-1.5",
      },
    },
  }),
};

export function CollapsibleGroup({
  groupKey,
  fieldPath,
  label,
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
    <div data-field-path={fieldPath ?? null}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
        aria-expanded={!isCollapsed}
        className={collapsibleGroupVariants.wrapper({ level })}
      >
        <span className={collapsibleGroupVariants.label({ level })}>
          {label}
        </span>

        <ChevronDown
          className={cn(
            "shrink-0 w-4 h-4 text-(--theme-elevation-450) transition-transform duration-150",
            isCollapsed && "-rotate-90"
          )}
        />
      </div>

      {!isCollapsed && (
        <div className={collapsibleGroupVariants.childWrapper({ level })}>
          {children}
        </div>
      )}
    </div>
  );
}
