/**
 * Joins class names, and deliberately does NOT go through `cn`.
 *
 * `cn` runs tailwind-merge, which has no idea `text-display-2`, `text-h-section`, `text-small` and
 * `text-eyebrow` are custom utilities - it reads any unknown `text-*` as a text COLOUR, so a colour
 * class beside one of them silently deletes the size, weight and tracking. Verified against
 * tailwind-merge 3.4.0: `cn("text-eyebrow", "text-primary")` returns just `text-primary`.
 *
 * Nothing here ever merges a caller's className, so tailwind-merge buys this section nothing.
 */
export function classNames(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
