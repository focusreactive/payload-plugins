"use client";

import { cn } from "@/core/lib/utils";

interface Props {
  isActive: boolean;
  slug?: string;
  title: string;
  onClick: () => void;
}

export function Category({ isActive, slug, title, onClick }: Props) {
  return (
    <button
      key={slug}
      onClick={() => onClick()}
      className={cn(
        "px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
        isActive ? "bg-primary text-white" : "bg-primary-soft text-primary hover:bg-primary hover:text-white"
      )}
    >
      {title}
    </button>
  );
}
