"use client";

import { useState } from "react";

import { cn } from "@/components/utils";

export interface PersonCard {
  id: string;
  name: string;
  jobTitle: string;
  office: string | null;
  href: string | null;
  photo: React.ReactNode;
}

interface PeopleDirectoryProps {
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  cards: PersonCard[];
  allLabel: string;
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

function PersonCardView({ card }: { card: PersonCard }) {
  return (
    <article
      className={cn(
        "group relative grid h-full grid-cols-[112px_1fr] overflow-hidden rounded-xl bg-surface-raised",
        // The ring lives on an overlay above the photo: an inset ring on the card itself is
        // painted under the photo, so the hover border stopped at the photo's edge.
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:ring-1 after:ring-secondary_alt after:ring-inset after:transition-shadow after:duration-150",
        card.href && "hover:after:ring-2 hover:after:ring-brand"
      )}
    >
      <div className="relative min-h-36 bg-secondary">
        {card.photo ?? (
          <span className="absolute inset-0 grid place-items-center text-display-xs font-semibold text-quaternary">
            {initialsOf(card.name)}
          </span>
        )}
      </div>
      <div className="flex flex-col justify-center gap-1 p-5">
        <h3 className="text-lg font-semibold text-primary">
          {card.href ? (
            <a
              href={card.href}
              className="rounded-md outline-focus-ring after:absolute after:inset-0 after:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {card.name}
            </a>
          ) : (
            card.name
          )}
        </h3>
        <p className="text-md text-pretty text-brand-secondary">{card.jobTitle}</p>
        {card.office && <p className="mt-2 text-sm text-tertiary">{card.office}</p>}
      </div>
    </article>
  );
}

/**
 * Untitled UI's team-section layout with an office filter on top. The pills are the Office
 * values on the Person records, counted, so a profile moved to another office changes the filter
 * without anyone editing this page.
 */
export function PeopleDirectory({
  eyebrow,
  heading,
  description,
  cards,
  allLabel,
}: PeopleDirectoryProps) {
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  const officeCounts = new Map<string, number>();
  for (const card of cards) {
    if (card.office) officeCounts.set(card.office, (officeCounts.get(card.office) ?? 0) + 1);
  }
  const offices = [...officeCounts.entries()].sort(
    (first, second) => second[1] - first[1] || first[0].localeCompare(second[0])
  );
  const visibleCards = selectedOffice
    ? cards.filter((card) => card.office === selectedOffice)
    : cards;

  const pills: { label: string; count: number; value: string | null }[] = [
    { label: allLabel, count: cards.length, value: null },
    ...offices.map(([office, count]) => ({ label: office, count, value: office })),
  ];

  return (
    <div className="py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
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

        {offices.length > 1 && (
          <div
            className="mt-10 flex flex-wrap gap-2 md:mt-12"
            role="group"
            aria-label={heading ?? undefined}
          >
            {pills.map((pill) => {
              const isSelected = pill.value === selectedOffice;
              return (
                <button
                  key={pill.label}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedOffice(pill.value)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors duration-150 ring-inset outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                    isSelected
                      ? "bg-brand-solid text-white ring-transparent"
                      : "bg-surface-raised text-secondary ring-secondary_alt hover:ring-brand"
                  )}
                >
                  {pill.label}{" "}
                  <span className={isSelected ? "text-white/70" : "text-quaternary"}>
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {visibleCards.map((card) => (
            <li key={card.id}>
              <PersonCardView card={card} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
