"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/style";

const GAP = 8;

interface Coords {
  top: number;
  left: number;
  transform: string;
}

function computeCoords(rect: DOMRect, side: NonNullable<TooltipProps["side"]>, align: NonNullable<TooltipProps["align"]>, width: number): Coords {
  let left = align === "start" ? rect.left : align === "end" ? rect.right - width : rect.left + rect.width / 2 - width / 2;

  const maxLeft = Math.max(GAP, window.innerWidth - width - GAP);
  left = Math.max(GAP, Math.min(left, maxLeft));

  return side === "top" ? { top: rect.top - GAP, left, transform: "translateY(-100%)" } : { top: rect.bottom + GAP, left, transform: "none" };
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  width?: number;
  className?: string;
}

export function Tooltip({ content, children, side = "bottom", align = "start", width = 290, className }: TooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const isOpen = coords != null;

  const open = useCallback(() => {
    const el = triggerRef.current;

    if (el) {
      setCoords(computeCoords(el.getBoundingClientRect(), side, align, width));
    }
  }, [side, align, width]);

  const close = useCallback(() => setCoords(null), []);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen, close]);

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-flex cursor-help outline-none", className)}
      tabIndex={0}
      aria-describedby={isOpen ? tooltipId : undefined}
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
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[100] flex cursor-default flex-col gap-[7px] rounded-rs bg-neutral-1000 px-[13px] py-[11px] text-left font-normal normal-case tracking-normal text-neutral-0 shadow-popover animate-seo-fade-in motion-reduce:animate-none"
            style={{
              top: coords.top,
              left: coords.left,
              width,
              transform: coords.transform,
            }}
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
  return <span className="text-[11.5px] leading-[1.45] text-neutral-300">{children}</span>;
}
