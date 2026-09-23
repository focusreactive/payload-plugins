import { Avatar } from "@/shared/ui/shadcn/base/avatar/avatar";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";

export interface InsightCard {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  authorName: string | null;
  publishedAt: string | null;
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

/**
 * Untitled UI's blog-section-simple-left-aligned-01 with its Simple01Vertical card. The card's
 * thumbnail is dropped because Passle posts carry no image, and the title is not a link because
 * articles have no page of their own on this demo, so the arrow that promises one goes too.
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

        <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 md:mt-16 md:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <article className="flex h-full flex-col gap-5 border-t border-secondary pt-6">
                <div className="flex flex-col gap-2">
                  {card.category && (
                    <span className="text-sm font-semibold text-brand-secondary">
                      {card.category}
                    </span>
                  )}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-balance text-primary">
                      {card.title}
                    </h3>
                    <p className="line-clamp-3 text-md text-pretty text-tertiary">{card.summary}</p>
                  </div>
                </div>
                {card.authorName && (
                  <div className="mt-auto flex gap-2">
                    <Avatar
                      border
                      initials={initialsOf(card.authorName)}
                      alt={card.authorName}
                      size="md"
                    />
                    <div>
                      <p className="text-sm font-semibold text-primary">{card.authorName}</p>
                      {card.publishedAt && (
                        <time className="block text-sm text-tertiary">{card.publishedAt}</time>
                      )}
                    </div>
                  </div>
                )}
              </article>
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
