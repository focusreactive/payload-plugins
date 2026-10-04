import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The type-scale utilities (base.css / brand.css) are font sizes. Without this, tailwind-merge reads
// `text-h-section` as a colour and drops a colour class such as `text-heading` next to it.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-1",
            "display-2",
            "h-section",
            "h-card",
            "lead",
            "body-lg",
            "small",
            "eyebrow",
          ],
        },
      ],
    },
  },
});

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
