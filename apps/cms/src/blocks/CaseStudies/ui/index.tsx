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

function Story({ label, text }: { label: string; text?: string | null }) {
  if (!text) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-eyebrow text-primary">{label}</dt>
      <dd className="text-[1rem] leading-relaxed text-foreground">{text}</dd>
    </div>
  );
}

/**
 * Case study cards read top to bottom: sector and title, the technologies involved, the problem and
 * the solution as full-width prose, and the business result set apart as the takeaway.
 */
export function CaseStudies({ items, labels }: CaseStudiesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="not-prose grid gap-6 lg:grid-cols-2 xl:gap-8">
      {items.map((item, index) => (
        <li
          key={`${item.title}-${index}`}
          className="flex flex-col gap-6 rounded-lg border border-border bg-card p-7 lg:p-9"
        >
          <header className="flex flex-col gap-4">
            <span className="w-fit rounded-pill bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary-soft-foreground">
              {item.sectorLabel}
            </span>
            <h3 className="text-[clamp(1.375rem,1.8vw,1.75rem)] font-bold leading-tight text-heading">
              {item.title}
            </h3>
            {item.technologies.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Technologies">
                {item.technologies.map((tech) => (
                  <li
                    key={tech}
                    className="rounded-md bg-muted px-2.5 py-1 font-mono text-[0.75rem] text-muted-foreground"
                  >
                    {tech}
                  </li>
                ))}
              </ul>
            )}
          </header>

          <dl className="flex flex-1 flex-col gap-6 border-t border-border pt-6">
            <Story label={labels.problem} text={item.problem} />
            <Story label={labels.solution} text={item.solution} />
            {item.result && (
              <div className="mt-auto flex flex-col gap-2 rounded-md border-l-4 border-primary bg-primary-soft/50 p-5">
                <dt className="text-eyebrow text-primary">{labels.result}</dt>
                <dd className="text-[1rem] font-medium leading-relaxed text-heading">
                  {item.result}
                </dd>
              </div>
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}
