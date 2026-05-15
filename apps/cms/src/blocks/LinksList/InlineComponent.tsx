import { LinksList } from "@repo/ui";
import { AlignVariant } from "@repo/ui/components/sections/linksList/types";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { LinksListInlineBlock } from "@/payload-types";

export async function LinksListInlineComponent({
  links,
  alignVariant,
}: LinksListInlineBlock) {
  const locale = await resolveLocale();

  return (
    <LinksList
      links={(links ?? []).map((item) => prepareLinkProps(item.link, locale))}
      alignVariant={(alignVariant as AlignVariant) ?? AlignVariant.Left}
    />
  );
}
