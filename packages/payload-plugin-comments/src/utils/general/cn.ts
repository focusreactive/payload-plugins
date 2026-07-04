import type { ClassValue } from "clsx";
import clsx from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({ prefix: "frcomments" });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
