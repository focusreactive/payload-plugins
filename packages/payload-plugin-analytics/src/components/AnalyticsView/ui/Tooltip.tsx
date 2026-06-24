"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../utils/style";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  width?: number;
  className?: string;
}

const TIP_BASE =
  "pointer-events-none fixed z-[100] flex cursor-default flex-col gap-[7px] rounded-(--style-radius-s) bg-(--theme-elevation-1000) px-[13px] py-[11px] text-left font-normal normal-case tracking-normal text-(--theme-elevation-0) shadow-popover pa-animate-fade-in";

const GAP = 8;

interface Coords {
  top: number;
  left: number;
  transform: string;
}

function computeCoords(
  rect: DOMRect,
  side: NonNullable<TooltipProps["side"]>,
  align: NonNullable<TooltipProps["align"]>,
  width: number
): Coords {
  let left =
    align === "start"
      ? rect.left
      : align === "end"
        ? rect.right - width
        : rect.left + rect.width / 2 - width / 2;

  const maxLeft = Math.max(GAP, window.innerWidth - width - GAP);
  left = Math.max(GAP, Math.min(left, maxLeft));

  return side === "top"
    ? { top: rect.top - GAP, left, transform: "translateY(-100%)" }
    : { top: rect.bottom + GAP, left, transform: "none" };
}

export function Tooltip({
  content,
  children,
  side = "bottom",
  align = "start",
  width = 290,
  className,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const isOpen = coords != null;

  const open = useCallback(() => {
    const el = triggerRef.current;
    if (el) setCoords(computeCoords(el.getBoundingClientRect(), side, align, width));
  }, [side, align, width]);

  const close = useCallback(() => setCoords(null), []);

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      const el = triggerRef.current;
      if (el) setCoords(computeCoords(el.getBoundingClientRect(), side, align, width));
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, side, align, width]);

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-flex cursor-help outline-none", className)}
      tabIndex={0}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {children}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            className={TIP_BASE}
            style={{ top: coords.top, left: coords.left, width, transform: coords.transform }}
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  );
}

export function TooltipTitle({ children }: { children: ReactNode }) {
  return <span className="text-[12px] font-semibold">{children}</span>;
}

export function TooltipText({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11.5px] leading-[1.45] text-(--theme-elevation-300)">{children}</span>
  );
}

export function TooltipLegend({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 flex flex-col gap-1 border-t border-(--theme-elevation-700) pt-2">
      {children}
    </span>
  );
}

export function TooltipLegendRow({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px] font-[family-name:var(--font-mono)] text-[11px] text-(--theme-elevation-200)">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}
