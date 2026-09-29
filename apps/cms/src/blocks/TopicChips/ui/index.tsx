/**
 * The topic chip, in one place because it is the same affordance on the homepage block and in the
 * hero of a talk page. Those two rendered different borders, radii and text sizes for a link that
 * goes to the same route.
 */

import Link from "next/link";

export interface TopicChip {
  slug?: string | null;
  title?: string | null;
}

/** The path is /browse-topics/<slug> - the segment the client's live site already uses. */
export function TopicChipList({ topics }: { topics: TopicChip[] }) {
  if (topics.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2.5">
      {topics.map((topic) => (
        <li key={topic.slug ?? topic.title}>
          <Link
            className="text-small inline-flex items-center rounded-pill border border-border bg-surface px-4 py-1.5 text-muted-foreground transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-primary-soft hover:text-primary motion-reduce:transition-none"
            href={`/browse-topics/${topic.slug}`}
          >
            {topic.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
