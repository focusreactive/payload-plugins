"use client";

import { cn } from "@/core/lib/utils";

import { useBlogFilter } from "./BlogFilterProvider";

export function DimWhilePending({ children }: { children: React.ReactNode }) {
  const { isPending } = useBlogFilter();

  return <div className={cn("transition-opacity duration-200 motion-reduce:transition-none", isPending && "pointer-events-none opacity-50")}>{children}</div>;
}
