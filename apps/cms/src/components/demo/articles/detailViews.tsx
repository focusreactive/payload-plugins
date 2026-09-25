import NextLink from "next/link";

import { ArticleCard } from "@/blocks/InsightsList/ui";
import type { InsightCard } from "@/blocks/InsightsList/ui";
import { PersonJsonLd } from "@/components/seo/components";
import { RichText } from "@/components/shared";
import { getInsightHref, getPayloadClient, getPersonHref } from "@/dal/index";
import { MARKET_OPTIONS } from "@/lib/fields/marketsField";
import { getMediaUrl } from "@/lib/utils/getMediaUrl";
import type { Insight, Person } from "@/payload-types";
import { Avatar } from "@/shared/ui/shadcn/base/avatar/avatar";
import { Badge } from "@/shared/ui/shadcn/base/badges/badges";

const DATE_LOCALE: Record<string, string> = {
  en: "en-GB",
  fr: "fr-FR",
  ja: "ja-JP",
};

const COPY: Record<string, Record<string, string>> = {
  en: {
    writtenBy: "Written by",
    fromPassle: "Arrived from Passle. The author was matched to this profile by email address.",
    unmatched: "Arrived from Passle. No profile in the CMS matches this author's email yet.",
    articlesBy: "Articles by",
    none: "No articles in this language yet.",
    markets: "Markets",
  },
  fr: {
    writtenBy: "Rédigé par",
    fromPassle: "Arrivé de Passle. L’auteur a été rattaché à ce profil par son adresse e-mail.",
    unmatched: "Arrivé de Passle. Aucun profil du CMS ne correspond encore à l’e-mail de l’auteur.",
    articlesBy: "Articles de",
    none: "Aucun article dans cette langue pour l’instant.",
    markets: "Marchés",
  },
  ja: {
    writtenBy: "著者",
    fromPassle:
      "Passleから届いた記事です。著者はメールアドレスでこのプロフィールに紐付けられています。",
    unmatched:
      "Passleから届いた記事です。この著者のメールアドレスに一致するプロフィールはまだありません。",
    articlesBy: "著者の記事：",
    none: "この言語の記事はまだありません。",
    markets: "市場",
  },
};

function copyFor(locale: string) {
  return COPY[locale] ?? COPY.en;
}

function marketLabels(markets: string[] | null | undefined) {
  return (markets ?? []).flatMap((value) => {
    const label = MARKET_OPTIONS.find((option) => option.value === value)?.label;
    return label ? [label] : [];
  });
}

// Passle's snippet is the article's first sentences cut mid-word. Shown above a body that opens
// with the same words, it reads as a duplicated, broken paragraph.
function bodyRepeatsStandfirst(insight: Insight) {
  const standfirst = insight.standfirst?.trim();
  if (!standfirst) return false;
  const bodyText = JSON.stringify(insight.body ?? "").replace(/\\n/gu, " ");
  return bodyText.includes(standfirst.slice(0, 60));
}

function photoUrlOf(person: Person) {
  return typeof person.photo === "object" && person.photo ? getMediaUrl(person.photo.url) : null;
}

function initialsOf(name: string) {
  const words = name
    .replace(/\b[A-Z]\.\s*/gu, "")
    .split(/[\s-]+/u)
    .filter(Boolean);
  return (
    (words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")
  ).toUpperCase();
}

/**
 * The article page on Untitled UI's content-section-rich-text-01: a 720px reading column, the
 * body in their prose scale (prose, md:prose-lg), a lead paragraph, and the author footer under a
 * rule at the end. Above it, the blog-post header they pair it with: market, date, headline, and
 * the author, who links to the profile the webhook matched them to.
 */
export async function InsightDetail({ insight, locale }: { insight: Insight; locale: string }) {
  const copy = copyFor(locale);
  const author = typeof insight.author === "object" && insight.author ? insight.author : null;
  const authorHref = author ? await getPersonHref(author, locale) : null;
  const date = insight.publishedDate
    ? new Intl.DateTimeFormat(DATE_LOCALE[locale] ?? "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(insight.publishedDate))
    : null;
  const showLead = Boolean(insight.standfirst) && !bodyRepeatsStandfirst(insight);

  const authorLink = (className: string) =>
    author ? (
      authorHref ? (
        <NextLink href={authorHref} className={className}>
          {author.name}
        </NextLink>
      ) : (
        <span className={className}>{author.name}</span>
      )
    ) : null;

  return (
    <article>
      <header className="pt-10 pb-10 md:pt-16 md:pb-12">
        <div className="mx-auto max-w-container px-4 md:px-8">
          <div className="mx-auto flex max-w-180 flex-col items-center text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {marketLabels(insight.markets).map((label) => (
                <Badge key={label} type="pill-color" color="brand" size="md">
                  {label}
                </Badge>
              ))}
            </div>
            <h1 className="mt-4 text-display-md font-semibold text-balance text-primary md:text-display-lg">
              {insight.title}
            </h1>
            <p className="mt-4 text-md text-tertiary md:mt-6 md:text-lg">
              {author && (
                <>
                  {copy.writtenBy}{" "}
                  {authorLink(
                    "font-semibold text-primary underline-offset-4 hover:text-brand-secondary hover:underline"
                  )}
                  {date && " · "}
                </>
              )}
              {date && <time>{date}</time>}
            </p>
          </div>
        </div>
      </header>

      <div className="pb-16 md:pb-24">
        <div className="mx-auto max-w-container px-4 md:px-8">
          <div className="mx-auto max-w-prose border-t border-secondary pt-10 md:max-w-180 md:pt-12">
            <div className="mx-auto prose md:prose-lg">
              {showLead && <p className="lead">{insight.standfirst}</p>}
            </div>
            {insight.body && <RichText content={insight.body} className="mx-auto md:prose-lg" />}

            <div className="mt-12 flex flex-col items-start justify-between gap-y-6 border-t border-secondary pt-6 md:flex-row md:items-center">
              {author ? (
                <div className="flex items-center gap-3 md:gap-4">
                  <Avatar
                    rounded={false}
                    src={photoUrlOf(author)}
                    initials={initialsOf(author.name)}
                    alt={author.name}
                    className="h-16 w-13 rounded-sm"
                    contentClassName="rounded-sm [&_img]:object-top"
                  />
                  <div>
                    {authorLink(
                      "block text-md font-semibold text-primary underline-offset-4 hover:text-brand-secondary hover:underline md:text-lg"
                    )}
                    {author.jobTitle && (
                      <p className="text-md text-tertiary">
                        {[author.jobTitle, author.office].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-tertiary">{copy.unmatched}</p>
              )}
              {author && (
                <p className="max-w-72 text-sm text-pretty text-tertiary md:text-right">
                  {copy.fromPassle}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * The profile page: Untitled's team-member card scaled up to a header, then the person's own
 * articles in this language, read live the same way the insights list reads them.
 */
export async function PersonDetail({ person, locale }: { person: Person; locale: string }) {
  const copy = copyFor(locale);
  const payload = await getPayloadClient();
  const articles = await payload.find({
    collection: "insight",
    locale: locale as "en",
    fallbackLocale: false,
    where: {
      and: [{ author: { equals: person.id } }, { title: { exists: true } }],
    },
    sort: "-publishedDate",
    limit: 50,
    depth: 0,
  });
  const dateFormatter = new Intl.DateTimeFormat(DATE_LOCALE[locale] ?? "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // The insights list's card, without the author row: every card here is by this person.
  const articleCards: InsightCard[] = await Promise.all(
    articles.docs
      .filter((doc) => doc.title)
      .map(async (doc) => ({
        id: String(doc.id),
        title: doc.title,
        summary: doc.standfirst ?? "",
        category: marketLabels(doc.markets)[0] ?? null,
        authorName: null,
        authorPhotoUrl: null,
        publishedAt: doc.publishedDate ? dateFormatter.format(new Date(doc.publishedDate)) : null,
        href: await getInsightHref(doc, locale),
        authorHref: null,
      }))
  );

  return (
    <section className="pt-10 pb-16 md:pt-16 md:pb-24">
      <PersonJsonLd
        person={person}
        profileUrl={await getPersonHref(person, locale)}
        locale={locale}
      />
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="max-w-180">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <Avatar
              rounded={false}
              src={photoUrlOf(person)}
              initials={initialsOf(person.name)}
              alt={person.name}
              size="2xl"
              className="h-40 w-32 rounded-sm"
              contentClassName="rounded-sm [&_img]:object-top"
            />
            <div>
              <h1 className="text-display-sm font-semibold text-primary md:text-display-md">
                {person.name}
              </h1>
              <p className="mt-1 text-lg text-brand-secondary">
                {[person.jobTitle, person.office].filter(Boolean).join(" · ")}
              </p>
              {marketLabels(person.markets).length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-tertiary">{copy.markets}</span>
                  {marketLabels(person.markets).map((label) => (
                    <Badge key={label} type="pill-color" color="gray" size="sm">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          {person.biography && (
            <p className="mt-8 text-lg text-pretty text-tertiary">{person.biography}</p>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-secondary pt-12 md:mt-16 md:pt-16">
          <h2 className="text-display-xs font-semibold text-primary md:text-display-sm">
            {copy.articlesBy} {person.name}
          </h2>
          {articleCards.length === 0 && <p className="text-md text-tertiary">{copy.none}</p>}
        </div>
        {articleCards.length > 0 && (
          <ul className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {articleCards.map((card) => (
              <li key={card.id}>
                <ArticleCard card={card} featured={false} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
