import { ContentCard } from "@/components/ui/ContentCard";
import { SectionMarker } from "@/components/ui/SectionMarker";
import { search } from "@/lib/search/search";
import { SEARCH_GROUP_LABELS } from "@/lib/search/types";

interface SearchResultsProps {
  query?: string;
  locale: string;
}

/**
 * Results are the site's own card, in a grid, grouped by what kind of thing each result is - the
 * same card the homepage rail and the talks archive draw, so a search result reads as part of the
 * site rather than as a list of links bolted to the side of it.
 *
 * Nothing shows a similarity score. It is a number between roughly 0.55 and 0.62 for every result
 * a 0.75 distance ceiling lets through, so it discriminates nothing a reader could act on and
 * invites them to argue with the ranking instead of reading it.
 */
export async function SearchResults({ locale, query }: SearchResultsProps) {
  if (!query) {
    return null;
  }

  const result = await search({ locale, query });

  if (!result.success) {
    return (
      <p className="mt-10 text-body text-muted-foreground">Search is unavailable right now.</p>
    );
  }

  if (result.data.length === 0) {
    return (
      <p className="mt-10 text-body text-muted-foreground">
        Nothing matched &ldquo;{query}&rdquo;. Try a feeling or a situation rather than a title -
        this search reads meaning, not keywords.
      </p>
    );
  }

  return (
    <div className="mt-[clamp(32px,3.4vw,56px)] flex flex-col gap-[clamp(40px,4vw,64px)]">
      {result.data.map((group) => (
        <section key={group.collection}>
          <SectionMarker>{SEARCH_GROUP_LABELS[group.collection]}</SectionMarker>

          <ul className="mt-[clamp(16px,1.8vw,26px)] grid list-none grid-cols-1 gap-[clamp(16px,1.6vw,24px)] sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <li className="flex min-w-0" key={item.documentId}>
                <ContentCard
                  cover={
                    item.imageUrl
                      ? {
                          data: {
                            alt: item.imageAlt ?? item.title,
                            kind: "image",
                            src: item.imageUrl,
                          },
                        }
                      : undefined
                  }
                  eyebrow={SEARCH_GROUP_LABELS[group.collection]}
                  href={item.url}
                  title={item.title}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
