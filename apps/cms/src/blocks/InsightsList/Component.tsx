import type { Where } from "payload";

import { SectionContainer } from "@/components/shared";
import { MARKET_OPTIONS } from "@/lib/fields/marketsField";
import { getInsightHref, getPayloadClient, getPersonHref } from "@/lib/dal";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { InsightsListBlock, Person } from "@/payload-types";

import { InsightsList } from "./ui";
import type { InsightCard } from "./ui";

const ALL_MARKETS_LABEL: Record<string, string> = {
  en: "All markets",
  fr: "Tous les marchés",
  ja: "全市場",
};

const DATE_LOCALE_BY_SITE_LOCALE: Record<string, string> = {
  en: "en-GB",
  fr: "fr-FR",
  ja: "ja-JP",
};

export async function InsightsListBlockComponent({
  eyebrow,
  heading,
  description,
  limit,
  markets,
  viewAll,
  section,
  id,
}: InsightsListBlock) {
  const locale = await resolveLocale();
  const payload = await getPayloadClient();

  // fallback-locale none plus a title filter: a French page lists only articles that have a
  // French title, instead of English headlines under a French heading.
  const conditions: Where[] = [{ title: { exists: true } }];
  if (markets?.length) conditions.push({ markets: { in: markets } });

  const result = await payload.find({
    collection: "insight",
    locale: locale as "en",
    fallbackLocale: false,
    where: { and: conditions },
    sort: "-publishedDate",
    limit: limit ?? 6,
    depth: 1,
  });

  const dateFormatter = new Intl.DateTimeFormat(DATE_LOCALE_BY_SITE_LOCALE[locale] ?? "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cards: InsightCard[] = await Promise.all(
    result.docs
      .filter((doc) => doc.title)
      .map(async (doc) => {
        const author = typeof doc.author === "object" && doc.author ? (doc.author as Person) : null;
        const firstMarket = doc.markets?.[0];
        return {
          id: String(doc.id),
          title: doc.title,
          summary: doc.standfirst ?? "",
          // An article filed under no market still gets a label, so every title in a row starts at
          // the same height.
          category:
            MARKET_OPTIONS.find((option) => option.value === firstMarket)?.label ??
            ALL_MARKETS_LABEL[locale] ??
            ALL_MARKETS_LABEL.en,
          authorName: author?.name ?? null,
          publishedAt: doc.publishedDate ? dateFormatter.format(new Date(doc.publishedDate)) : null,
          href: await getInsightHref(doc, locale),
          authorHref: author ? await getPersonHref(author, locale) : null,
        };
      })
  );

  const viewAllLink = viewAll ? prepareLinkProps(viewAll, locale) : null;

  return (
    <SectionContainer
      // blog-section-simple-left-aligned-01 carries its own padding and container.
      sectionData={{ ...section, id, paddingY: "none", paddingX: "none", maxWidth: "none" }}
    >
      <InsightsList
        eyebrow={eyebrow}
        heading={heading}
        description={description}
        cards={cards}
        viewAll={viewAllLink?.href && viewAllLink.text ? viewAllLink : null}
      />
    </SectionContainer>
  );
}
