import type { Field, GroupField } from "payload";

import { link } from "./link";

// WealthBriefing link field. Wraps the shared `link()` builder with the policy
// the WB sections need: no appearance selector (each section's ui owns how a
// link looks), optional (content-driven, a card may have no link), and no
// label for whole-card/title links where the visible text is the headline.
//
// `withLabel` keeps the link's own label field for standalone CTAs
// ("Explore awards by brand", "View", "Read latest intelligence"); omit it for
// links whose visible text is a sibling field (a card title, a today-strip row).
//
// `label` overrides the admin display label of the whole group (Payload derives
// it from `name`, so "cta" would show as "Cta" — pass "CTA" to fix it).
export function wbLink(options?: {
  name?: string;
  withLabel?: boolean;
  label?: GroupField["label"];
}): Field {
  const { name = "link", withLabel = false, label } = options ?? {};

  const overrides: Partial<GroupField> = {
    ...(name === "link" ? {} : { name }),
    ...(label ? { label } : {}),
  };

  return link({
    appearances: false,
    disableLabel: !withLabel,
    required: false,
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  });
}
