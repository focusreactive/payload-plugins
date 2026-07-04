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
