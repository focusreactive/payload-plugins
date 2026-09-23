import NextLink from "next/link";

import { RichText } from "@/components/shared";
import { getInsightHref, getPayloadClient, getPersonHref } from "@/dal/index";
import { MARKET_OPTIONS } from "@/lib/fields/marketsField";
import type { Insight, Person } from "@/payload-types";
import { Avatar } from "@/shared/ui/shadcn/base/avatar/avatar";
import { Badge } from "@/shared/ui/shadcn/base/badges/badges";

const DATE_LOCALE: Record<string, string> = { en: "en-GB", fr: "fr-FR", ja: "ja-JP" };

const COPY: Record<string, Record<string, string>> = {
  en: {
    back: "All insights",
    backPeople: "All people",
    writtenBy: "Written by",
    fromPassle: "Arrived from Passle. The author was matched to this profile by email address.",
    unmatched: "Arrived from Passle. No profile in the CMS matches this author's email yet.",
    articlesBy: "Articles by",
    none: "No articles in this language yet.",
    markets: "Markets",
  },
  fr: {
    back: "Tous les articles",
    backPeople: "Toute l’équipe",
    writtenBy: "Rédigé par",
    fromPassle: "Arrivé de Passle. L’auteur a été rattaché à ce profil par son adresse e-mail.",
    unmatched: "Arrivé de Passle. Aucun profil du CMS ne correspond encore à l’e-mail de l’auteur.",
    articlesBy: "Articles de",
    none: "Aucun article dans cette langue pour l’instant.",
    markets: "Marchés",
  },
  ja: {
    back: "インサイト一覧",
    backPeople: "専門家一覧",
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
 * The article page, on the proportions of Untitled UI's blog post template: a narrow reading
 * column, the category and date above a display headline, the standfirst as a lead, then the
 * author card that links to the person the webhook matched.
 */
export async function InsightDetail({
  insight,
  locale,
  listingHref,
}: {
  insight: Insight;
  locale: string;
  listingHref: string | null;
}) {
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

  return (
    <article className="py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="mx-auto max-w-180">
          {listingHref && (
            <NextLink
              href={listingHref}
              className="text-sm font-semibold text-brand-secondary hover:text-brand-secondary_hover"
            >
              ← {copy.back}
            </NextLink>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {marketLabels(insight.markets).map((label) => (
              <Badge key={label} type="pill-color" color="brand" size="md">
                {label}
              </Badge>
            ))}
            {date && <time className="text-sm text-tertiary">{date}</time>}
          </div>
          <h1 className="mt-4 text-display-md font-semibold text-balance text-primary md:text-display-lg">
            {insight.title}
          </h1>
          {insight.standfirst && (
            <p className="mt-4 text-lg text-pretty text-tertiary md:mt-6 md:text-xl">
              {insight.standfirst}
            </p>
          )}

          <div className="mt-8 flex items-center gap-3 border-y border-secondary py-6">
            {author ? (
              <>
                <Avatar border initials={initialsOf(author.name)} alt={author.name} size="lg" />
                <div className="flex-1">
                  <p className="text-sm text-tertiary">{copy.writtenBy}</p>
                  {authorHref ? (
                    <NextLink
                      href={authorHref}
                      className="text-md font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {author.name}
                    </NextLink>
                  ) : (
                    <p className="text-md font-semibold text-primary">{author.name}</p>
                  )}
                  {author.jobTitle && <p className="text-sm text-tertiary">{author.jobTitle}</p>}
                </div>
                <p className="hidden max-w-60 text-sm text-pretty text-tertiary md:block">
                  {copy.fromPassle}
                </p>
              </>
            ) : (
              <p className="text-sm text-tertiary">{copy.unmatched}</p>
            )}
          </div>

          {insight.body && (
            <div className="mt-10 text-lg text-secondary">
              <RichText content={insight.body} variant="content" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * The profile page: Untitled's team-member card scaled up to a header, then the person's own
 * articles in this language, read live the same way the insights list reads them.
 */
export async function PersonDetail({
  person,
  locale,
  listingHref,
}: {
  person: Person;
  locale: string;
  listingHref: string | null;
}) {
  const copy = copyFor(locale);
  const payload = await getPayloadClient();
  const articles = await payload.find({
    collection: "insight",
    locale: locale as "en",
    fallbackLocale: false,
    where: { and: [{ author: { equals: person.id } }, { title: { exists: true } }] },
    sort: "-publishedDate",
    limit: 50,
    depth: 0,
  });
  const articleLinks = await Promise.all(
    articles.docs
      .filter((doc) => doc.title)
      .map(async (doc) => ({ doc, href: await getInsightHref(doc, locale) }))
  );

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="mx-auto max-w-180">
          {listingHref && (
            <NextLink
              href={listingHref}
              className="text-sm font-semibold text-brand-secondary hover:text-brand-secondary_hover"
            >
              ← {copy.backPeople}
            </NextLink>
          )}
          <div className="mt-8 flex flex-col items-start gap-6 md:flex-row md:items-center">
            <Avatar border initials={initialsOf(person.name)} alt={person.name} size="2xl" />
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

          <h2 className="mt-12 text-xl font-semibold text-primary">
            {copy.articlesBy} {person.name}
          </h2>
          {articleLinks.length === 0 ? (
            <p className="mt-4 text-md text-tertiary">{copy.none}</p>
          ) : (
            <ul className="mt-4 divide-y divide-secondary border-y border-secondary">
              {articleLinks.map(({ doc, href }) => (
                <li key={doc.id} className="py-5">
                  {href ? (
                    <NextLink
                      href={href}
                      className="text-md font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {doc.title}
                    </NextLink>
                  ) : (
                    <span className="text-md font-semibold text-primary">{doc.title}</span>
                  )}
                  {doc.standfirst && (
                    <p className="mt-1 line-clamp-2 text-md text-tertiary">{doc.standfirst}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
