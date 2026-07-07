import { SectionHeader } from "@/components/wb/primitives";

import type { WbPeopleMovesItem, WbPeopleMovesProps } from "./types";

function AppointmentRow({ item }: { item: WbPeopleMovesItem }) {
  return (
    <a
      href={item.href ?? "#"}
      // Row hover shifts the hairline to faint grey; the title turns teal via group-hover.
      className="group grid grid-cols-[150px_1fr] items-start gap-8 border-b border-border py-6 no-underline transition-colors last:border-b-0 hover:border-faint"
    >
      <div className="pt-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-faint">
        {item.date}
      </div>
      <div className="flex flex-col gap-[5px]">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-secondary">
          <span>{item.category}</span>
          <span className="text-faint">·</span>
          <span className="font-medium text-faint">{item.region}</span>
        </div>
        <div className="font-display text-[16px] font-medium leading-[1.35] text-foreground transition-colors group-hover:text-secondary">
          {item.title}
        </div>
      </div>
    </a>
  );
}

export function WbPeopleMoves({
  eyebrow = "People Moves",
  title = "Industry Appointments",
  cta = "View all people moves",
  ctaHref = "#",
  items,
}: WbPeopleMovesProps) {
  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-[88px]">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        cta={cta}
        ctaHref={ctaHref}
        divider
        className="mb-2"
        // Comp h2 is 32px/1.12 here, a step down from the 36px section default.
        titleClassName="text-[32px]! leading-[1.12]!"
      />
      <div>
        {items.map((item) => (
          <AppointmentRow item={item} key={item.title} />
        ))}
      </div>
    </section>
  );
}
