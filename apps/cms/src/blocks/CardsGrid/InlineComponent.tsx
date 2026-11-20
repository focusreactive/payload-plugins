import { CardsGrid } from "./ui";
import type { ICardContent } from "./ui/types";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { CardsGridInlineBlock } from "@/payload-types";

import { prepareCardsGridSettings } from "./gridSettings";

export async function CardsGridInlineComponent({ items, ...settings }: CardsGridInlineBlock) {
  const locale = await resolveLocale();

  const cards: ICardContent[] = (items ?? []).map((item) => ({
    description: item.description ?? undefined,
    image: prepareMediaProps(item.image ?? null),
    link: prepareLinkProps(item.link, locale),
    title: item.title,
  }));

  return (
    <div className="prose-embedded-block">
      <CardsGrid items={cards} {...prepareCardsGridSettings(settings)} />
    </div>
  );
}
