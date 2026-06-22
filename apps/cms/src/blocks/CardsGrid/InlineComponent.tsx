import { CardsGrid } from "./ui";
import type { IDefaultCardProps } from "./ui/types";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { CardsGridInlineBlock } from "@/payload-types";

export async function CardsGridInlineComponent({ items, columns }: CardsGridInlineBlock) {
  const locale = await resolveLocale();

  const cards: IDefaultCardProps[] = (items ?? []).map((item) => ({
    alignVariant: (item.alignVariant as IDefaultCardProps["alignVariant"]) ?? "center",
    backgroundColor: (item.backgroundColor as IDefaultCardProps["backgroundColor"]) ?? "none",
    description: item.description ?? undefined,
    image: prepareImageProps(item.image ?? null),
    link: prepareLinkProps(item.link, locale),
    rounded: (item.rounded as IDefaultCardProps["rounded"]) ?? "none",
    title: item.title,
  }));

  return (
    <div className="prose-embedded-block">
      <CardsGrid items={cards} columns={columns ?? 3} />
    </div>
  );
}
