"use client";

import { cn } from "@/components/utils";
import { Link } from "@/components/shared";

import { useBlogFilter } from "./BlogFilterProvider";

interface FilterChipProps {
  href: string;
  label: string;
  isActive: boolean;
}

export function FilterChip({ href, label, isActive }: FilterChipProps) {
  const { isPending, pendingHref, navigate } = useBlogFilter();

  const isTarget = isActive || pendingHref === href;
  const isDimmed = isPending && !isTarget;

  return (
    <Link
      href={href}
      aria-current={isActive ? "true" : undefined}
      onClick={(e) => {
        if (
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.button !== 0
        ) {
          return;
        }
        e.preventDefault();
        navigate(href);
      }}
      className={cn(
        "rounded-pill border px-4 py-[9px] font-mono text-[0.72rem] uppercase leading-none tracking-[0.1em] transition-[color,background-color,border-color,opacity] motion-reduce:transition-none",
        isActive
          ? "border-foreground bg-foreground text-background"
          : "border-border-strong text-muted-foreground hover:border-foreground hover:text-foreground",
        isDimmed && "pointer-events-none opacity-50"
      )}
    >
      {label}
    </Link>
  );
}
