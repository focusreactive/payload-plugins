import { SectionHeader } from "@/components/wb/primitives";

import type { WbAwardItem, WbAwardsProps } from "./types";

function AwardCard({ item }: { item: WbAwardItem }) {
  return (
    <a
      href={item.href}
      className="group flex flex-col rounded-sm border border-border bg-white px-[22px] pt-6 pb-[22px] no-underline transition-colors hover:border-secondary hover:bg-wash"
    >
      <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-faint">{item.region}</div>
      <div className="mb-3 font-display text-[20px] font-semibold leading-[1.25] text-foreground">
        {item.title}
      </div>
      <div className="text-[14px] leading-[1.5] text-muted-foreground">{item.description}</div>
      <span className="mt-6 text-[13px] font-semibold text-primary transition-colors group-hover:text-secondary">
        {item.cta}
      </span>
    </a>
  );
}

export function WbAwards({ eyebrow, title, cta, ctaHref = "#", items }: WbAwardsProps) {
  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-[84px]">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        cta={cta}
        ctaHref={ctaHref}
        className="pb-[32px]"
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {items.map((item) => (
          <AwardCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}
