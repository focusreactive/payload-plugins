import { getTitleProgress } from "@yoast/search-metadata-previews/build/helpers/progress";
import type { LengthProgress } from "@yoast/search-metadata-previews/build/helpers/progress";
import { AVG_GLYPH_PX } from "../../constants/generation";

export { AVG_GLYPH_PX };
export const TITLE_FALLBACK_MAX_PX = 600;

export function getTitleProgressGuarded(title: string): LengthProgress {
  if (typeof document !== "undefined") {
    return getTitleProgress(title);
  }

  const actual = Math.round(title.length * AVG_GLYPH_PX);
  const score = actual <= TITLE_FALLBACK_MAX_PX ? 9 : 1;

  return {
    actual,
    max: TITLE_FALLBACK_MAX_PX,
    score,
  };
}
