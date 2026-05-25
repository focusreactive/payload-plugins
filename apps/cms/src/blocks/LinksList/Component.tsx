import { LinksList } from "@repo/ui";
import { AlignVariant } from "@repo/ui/components/sections/linksList/types";
import React from "react";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { SectionContainer } from "@/core/ui";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { LinksListBlock } from "@/payload-types";

export async function LinksListBlockComponent({
  links,
  alignVariant,
  section,
  id,
}: LinksListBlock) {
  const locale = await resolveLocale();

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <LinksList
        links={(links ?? []).map((item) => prepareLinkProps(item.link, locale))}
        alignVariant={(alignVariant as AlignVariant) ?? AlignVariant.Left}
      />
    </SectionContainer>
  );
}
