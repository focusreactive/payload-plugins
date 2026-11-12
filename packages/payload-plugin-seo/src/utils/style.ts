import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import type { ClassValue } from "clsx";

const twMerge = extendTailwindMerge({ prefix: "frseo" });

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const ROW_SEPARATOR = cn(
  "not-last:after:content-[''] not-last:after:absolute not-last:after:inset-x-[15px] not-last:after:bottom-0 not-last:after:h-px not-last:after:bg-neutral-200"
);

export const OUTLINE_BUTTON_CLASS = cn(
  "inline-flex items-center gap-[6px] rounded-rs border border-neutral-200 bg-transparent px-[9px] py-[4px] text-[12px] font-semibold text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-100 cursor-pointer disabled:cursor-default disabled:text-neutral-400 aria-disabled:cursor-default aria-disabled:text-neutral-400"
);
