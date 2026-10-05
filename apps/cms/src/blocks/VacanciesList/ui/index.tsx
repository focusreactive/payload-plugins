import { Link } from "@/components/shared";

export interface VacanciesListItem {
  href: string;
  title: string;
  summary: string;
  facts: string[];
}

interface VacanciesListProps {
  items: VacanciesListItem[];
  emptyText?: string | null;
}

export function VacanciesList({ items, emptyText }: VacanciesListProps) {
  if (items.length === 0) {
    return emptyText ? <p className="text-lead text-muted-foreground">{emptyText}</p> : null;
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.href}>
          <article className="group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-6 transition-[border-color,box-shadow] duration-200 hover:border-primary hover:shadow-[inset_0_3px_0_var(--color-highlight)] md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-h-card text-heading">
                <Link
                  href={item.href}
                  className="underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline"
                >
                  {item.title}
                </Link>
              </h3>
              <p className="max-w-[70ch] text-muted-foreground">{item.summary}</p>
            </div>
            {item.facts.length > 0 && (
              <ul
                className="flex shrink-0 flex-wrap gap-2 md:justify-end"
                aria-label="Role details"
              >
                {item.facts.map((fact) => (
                  <li
                    key={fact}
                    className="rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground"
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
