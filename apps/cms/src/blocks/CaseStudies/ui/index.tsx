import { cn } from "@/components/utils";

export interface CaseStudyCardProps {
  title: string;
  sectorLabel: string;
  technologies: string[];
  problem?: string | null;
  solution?: string | null;
  result?: string | null;
}

export interface CaseStudiesProps {
  items: CaseStudyCardProps[];
  labels: { problem: string; solution: string; result: string };
}

/** §6.7: two-column cards, sector pill, three labelled columns, technology pills; white/sand alternate. */
export function CaseStudies({ items, labels }: CaseStudiesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="not-prose grid gap-6 lg:grid-cols-2 xl:gap-8">
      {items.map((item, index) => (
        <li
          key={`${item.title}-${index}`}
          className={cn(
            "flex flex-col gap-5 rounded-lg border border-border p-7",
            index % 2 === 0 ? "bg-ct-white" : "bg-ct-sand"
          )}
        >
          <span className="w-fit rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
            {item.sectorLabel}
          </span>
          <h3 className="text-h-card text-heading">{item.title}</h3>
          <dl className="grid gap-5 md:grid-cols-3">
            {(
              [
                [labels.problem, item.problem],
                [labels.solution, item.solution],
                [labels.result, item.result],
              ] as const
            ).map(([label, text]) =>
              text ? (
                <div key={label} className="flex flex-col gap-2">
                  <dt className="text-eyebrow text-ct-grey-700">{label}</dt>
                  <dd className="text-small text-ct-grey-900">{text}</dd>
                </div>
              ) : null
            )}
          </dl>
          {item.technologies.length > 0 && (
            <ul className="mt-auto flex flex-wrap gap-2" aria-label="Technologies">
              {item.technologies.map((tech) => (
                <li
                  key={tech}
                  className="rounded-pill border border-ct-grey-400 px-2.5 py-1 text-xs text-ct-grey-800"
                >
                  {tech}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
