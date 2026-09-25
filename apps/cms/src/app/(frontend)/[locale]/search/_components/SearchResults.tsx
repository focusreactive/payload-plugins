import Image from "next/image";
import Link from "next/link";

import { search } from "@/lib/search/search";
import type { SearchCollection } from "@/lib/search/types";

const PLACEHOLDER = "/empty-placeholder.jpg";

// Mirrors each collection's own admin label (Insight/index.ts, Person/index.ts labels.plural.en);
// "Service" pages are tagged separately from "page" purely for this label (Page/isServicePage.ts).
const GROUP_LABELS: Record<SearchCollection, string> = {
  insight: "Insights",
  page: "Pages",
  person: "People",
  post: "Posts",
  service: "Services",
};

interface SearchResultsProps {
  query?: string;
  locale: string;
}

export async function SearchResults({ query, locale }: SearchResultsProps) {
  if (!query) {
    return null;
  }

  const result = await search({ locale, query });

  if (!result.success) {
    return (
      <div className="mt-6 space-y-2 text-sm text-gray-500">
        <p>Search unavailable, please try again.</p>
      </div>
    );
  }

  if (!result.data.length) {
    return (
      <div className="mt-6 space-y-2 text-sm text-gray-500">
        <p>No results found.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {result.data.map((group) => (
        <section key={group.collection}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {GROUP_LABELS[group.collection]}
          </h2>

          <div className="space-y-2">
            {group.items.map((item) => (
              <Link
                key={item.documentId}
                href={item.url}
                className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  <Image
                    src={item.imageUrl ?? PLACEHOLDER}
                    alt={item.imageAlt ?? item.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
