"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../../utils/style";

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  minWidth?: number;
  triggerClassName?: string;
}

export function Dropdown({ trigger, children, align = "right", minWidth = 220, triggerClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const on = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", on);
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("mousedown", on);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-s)] text-sm text-[var(--theme-elevation-800)] whitespace-nowrap hover:bg-[var(--theme-elevation-50)]",
          triggerClassName,
        )}>
        {trigger}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full mt-1.5 bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] shadow-popover p-1.5 z-50",
            align === "right" ? "right-0" : "left-0",
          )}
          style={{ minWidth }}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}
