"use client";

import { cn } from "@/components/utils";
import { Link } from "@/components/shared";

import { useBlogFilter } from "../../app/(frontend)/[locale]/blog/_components/BlogPageContent/components/BlogFilterProvider";

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
        "rounded-pill border px-5 py-2 text-small font-medium capitalize transition-[color,background-color,border-color,opacity] motion-reduce:transition-none",
        isActive
          ? "border-brand bg-surface text-foreground shadow-glow-tab"
          : "border-border-strong text-muted-foreground hover:border-white-40 hover:text-foreground",
        isDimmed && "pointer-events-none opacity-50"
      )}
    >
      {label}
    </Link>
  );
}
