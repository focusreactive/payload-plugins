import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The design system's type utilities have to be declared, or tailwind-merge silently eats them.
 *
 * Stock twMerge knows `text-sm` is a size and `text-red-500` is a colour, and it decides by the
 * suffix. `text-small` matches neither table, so it falls through to the colour group - which means
 * `cn("text-small", "text-foreground")` drops `text-small` entirely and the element renders at the
 * inherited size. It fails silently: valid class in, valid class out, one of them gone.
 *
 * That was live in the header's mega-menu links, which were rendering at body size rather than
 * 15px/1.45. Declaring the group fixes every current and future call site at once.
 */
/**
 * The layout tokens have to be declared for the same reason, and the failure is worse because it is
 * invisible in the markup rather than in the rendering.
 *
 * `max-w-containerMaxW`, `px-containerBase` and the section spacings come from `--spacing-*` in
 * `styles.css`. tailwind-merge does not know them, so it treats each as an unrecognised class and
 * keeps it - which means an override passed to `Container` does NOT replace the default, both
 * survive, and which one wins falls to CSS source order. Tailwind emits arbitrary values before
 * theme-named ones, so the default silently won every time: `HeroSpotlight` asked for
 * `max-w-[1520px]` and measured 1180px in the browser with all four classes on the element.
 *
 * Declaring the tokens as spacing values makes every spacing-based group recognise them, so an
 * override now actually overrides.
 */
const LAYOUT_SPACING_TOKENS = ["sectionBase", "sectionLarge", "containerBase", "containerMaxW"];

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
    theme: {
      spacing: LAYOUT_SPACING_TOKENS,
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
