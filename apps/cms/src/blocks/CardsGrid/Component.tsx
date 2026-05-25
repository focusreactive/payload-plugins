import { CardsGrid } from "@repo/ui";
import type { IDefaultCardProps } from "@repo/ui/components/sections/cardsGrid/types";
import React from "react";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { SectionContainer } from "@/core/ui";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { CardsGridBlock } from "@/payload-types";

export async function CardsGridBlockComponent({
  items,
  columns,
  section,
  id,
}: CardsGridBlock) {
  const locale = await resolveLocale();

  const cards: IDefaultCardProps[] = (items ?? []).map((item) => ({
    alignVariant:
      (item.alignVariant as IDefaultCardProps["alignVariant"]) ?? "center",
    backgroundColor:
      (item.backgroundColor as IDefaultCardProps["backgroundColor"]) ?? "none",
    description: item.description ?? undefined,
    image: prepareImageProps(item.image ?? null),
    link: prepareLinkProps(item.link, locale),
    rounded: (item.rounded as IDefaultCardProps["rounded"]) ?? "none",
    title: item.title,
  }));

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <CardsGrid items={cards} columns={columns ?? 3} />
    </SectionContainer>
  );
}
