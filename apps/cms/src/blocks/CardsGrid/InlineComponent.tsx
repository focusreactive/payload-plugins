import { CardsGrid } from "@repo/ui";
import type { IDefaultCardProps } from "@repo/ui/components/sections/cardsGrid/types";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { CardsGridInlineBlock } from "@/payload-types";

export async function CardsGridInlineComponent({
  items,
  columns,
}: CardsGridInlineBlock) {
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

  return <CardsGrid items={cards} columns={columns ?? 3} />;
}
