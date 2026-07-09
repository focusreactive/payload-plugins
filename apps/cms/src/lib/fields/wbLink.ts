import type { Field } from "payload";

import { link } from "./link";

// WealthBriefing link field. Wraps the shared `link()` builder with the policy
// the WB sections need: no appearance selector (each section's ui owns how a
// link looks), optional (content-driven, a card may have no link), and no
// label for whole-card/title links where the visible text is the headline.
//
// `withLabel` keeps the link's own label field for standalone CTAs
// ("Explore awards by brand", "View", "Read latest intelligence"); omit it for
// links whose visible text is a sibling field (a card title, a today-strip row).
export function wbLink(options?: { name?: string; withLabel?: boolean }): Field {
  const { name = "link", withLabel = false } = options ?? {};

  return link({
    appearances: false,
    disableLabel: !withLabel,
    required: false,
    ...(name === "link" ? {} : { overrides: { name } }),
  });
}
