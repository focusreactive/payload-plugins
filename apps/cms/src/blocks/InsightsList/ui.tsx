import { ArrowUpRight } from "@untitledui/icons";

import { cn } from "@/components/utils";
import { Avatar } from "@/shared/ui/shadcn/base/avatar/avatar";
import { Badge } from "@/shared/ui/shadcn/base/badges/badges";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";

export interface InsightCard {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  authorName: string | null;
  publishedAt: string | null;
  href: string | null;
  authorHref: string | null;
}

interface InsightsListProps {
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  cards: InsightCard[];
  viewAll: { href: string; text: string } | null;
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

export function ArticleCard({ card, featured }: { card: InsightCard; featured: boolean }) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-6 rounded-2xl bg-surface-raised p-6 ring-1 ring-secondary_alt transition-shadow duration-150 ease-out",
        // Ring colour only: a lift or a drop shadow on hover moved the card and its neighbours.
        card.href && "hover:ring-brand",
        featured && "md:p-8"
      )}
    >
      <div className="flex flex-col gap-3">
        {card.category && (
          <Badge type="pill-color" color="brand" size="sm" className="self-start">
            {card.category}
          </Badge>
        )}
        <h3
          className={cn(
            "font-semibold text-balance text-primary",
            featured ? "text-display-xs md:text-display-sm" : "text-lg"
          )}
        >
          {card.href ? (
            // The title link stretches over the whole card, so the card is one click target.
            // The author link below sits above it on its own layer.
            <a
              href={card.href}
              className="flex justify-between gap-x-4 rounded-md outline-focus-ring after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {card.title}
              <ArrowUpRight
                className="mt-0.5 size-6 shrink-0 text-fg-quaternary transition-colors duration-150 ease-out group-hover:text-fg-brand-primary"
                aria-hidden="true"
              />
            </a>
          ) : (
            card.title
          )}
        </h3>
        <p
          className={cn(
            "text-md text-pretty text-tertiary",
            featured ? "line-clamp-4 md:text-lg" : "line-clamp-3"
          )}
        >
          {card.summary}
        </p>
      </div>
      {!card.authorName && card.publishedAt && (
        <time className="mt-auto text-sm text-tertiary">{card.publishedAt}</time>
      )}
      {card.authorName && (
        <div className="mt-auto flex items-center gap-3">
          <Avatar border initials={initialsOf(card.authorName)} alt={card.authorName} size="md" />
          <div>
            {card.authorHref ? (
              <a
                href={card.authorHref}
                className="relative z-10 text-sm font-semibold text-primary underline-offset-4 hover:text-brand-secondary hover:underline"
              >
                {card.authorName}
              </a>
            ) : (
              <p className="text-sm font-semibold text-primary">{card.authorName}</p>
            )}
            {card.publishedAt && (
              <time className="block text-sm text-tertiary">{card.publishedAt}</time>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * Untitled UI's blog-section-simple-left-aligned-01 layout, with the newest article featured
 * across two columns. Passle posts carry no image, so each card is a raised panel instead of a
 * thumbnail, and the whole card is the link, with the author linking to their profile.
 */
export function InsightsList({ eyebrow, heading, description, cards, viewAll }: InsightsListProps) {
  return (
    <div className="py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row">
          <div className="max-w-3xl">
            {eyebrow && (
              <p className="text-sm font-semibold text-brand-secondary md:text-md">{eyebrow}</p>
            )}
            {heading && (
              <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
                {heading}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">{description}</p>
            )}
          </div>
          {viewAll && (
            <Button href={viewAll.href} size="xl" className="hidden lg:flex">
              {viewAll.text}
            </Button>
          )}
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {cards.map((card, index) => (
            <li key={card.id} className={cn(index === 0 && cards.length > 2 && "md:col-span-2")}>
              <ArticleCard card={card} featured={index === 0 && cards.length > 2} />
            </li>
          ))}
        </ul>

        {viewAll && (
          <div className="mt-12 flex flex-col lg:hidden">
            <Button href={viewAll.href} size="xl">
              {viewAll.text}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
