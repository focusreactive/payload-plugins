import type { Media } from "@/payload-types";

export function preparePosterUrl(poster: number | Media | null | undefined): string | null {
  if (!poster || typeof poster !== "object") {
    return null;
  }
  return poster.sizes?.large?.url ?? poster.url ?? null;
}
