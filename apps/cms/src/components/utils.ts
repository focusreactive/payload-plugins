import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLinkClickParams(disabled = false) {
  return {
    "aria-disabled": disabled,
    className: disabled ? "pointer-events-none" : "",
    onClick: disabled ? (e: any) => e.preventDefault() : undefined,
  };
}

export type BackdropTone = "dark" | "light";

const DARK_THEMES = new Set(["dark", "dark-gray"]);

export function resolveBackdropTone(theme: string | null | undefined): BackdropTone {
  return theme && DARK_THEMES.has(theme) ? "dark" : "light";
}

export { cva };
