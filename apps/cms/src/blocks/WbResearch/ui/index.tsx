import { Pill, SectionHeader } from "@/components/wb/primitives";

import type { WbResearchFeatured, WbResearchItem, WbResearchProps } from "./types";

function FeaturedCard({ featured }: { featured: WbResearchFeatured }) {
  return (
    <a
      href={featured.href ?? "#"}
      className="group flex flex-col overflow-hidden rounded-sm border border-border bg-white no-underline transition-colors hover:border-secondary"
    >
      <div className="relative h-[300px] overflow-hidden bg-[linear-gradient(135deg,#3a5a6d,#2a4250)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={featured.image} alt="" className="absolute inset-0 size-full object-cover" />
        <Pill variant="onImage" className="absolute right-5 top-[18px] bg-white/[0.16]">
          {featured.pill}
        </Pill>
      </div>
      <div className="pb-8 pl-8 pr-12 pt-8">
        <div className="mb-2.5 text-[12px] uppercase tracking-[0.08em] text-faint">
          {featured.meta}
        </div>
        <h3 className="m-0 mb-3 font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.015em] text-foreground">
          {featured.title}
        </h3>
        <p className="m-0 mb-[18px] max-w-[560px] text-[15px] leading-[1.6] text-muted-foreground">
          {featured.excerpt}
        </p>
        <span className="text-[14px] font-semibold text-primary transition-colors group-hover:text-secondary">
          {featured.cta}
        </span>
      </div>
    </a>
  );
}

function CompactCard({ item }: { item: WbResearchItem }) {
  return (
    <a
      href={item.href ?? "#"}
      className="group flex flex-1 flex-col justify-center gap-2 rounded-sm border border-border bg-white px-[22px] py-5 no-underline transition-colors hover:border-secondary"
    >
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-faint">{item.date}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-secondary">
          {item.type}
        </span>
      </div>
      <div className="font-display text-[16.5px] font-semibold leading-[1.28] text-foreground">
        {item.title}
      </div>
      <div className="text-[13px] leading-[1.5] text-muted-foreground">{item.desc}</div>
      <span className="text-[13px] font-semibold text-primary transition-colors group-hover:text-secondary">
        {item.cta}
      </span>
    </a>
  );
}

export function WbResearch({
  eyebrow,
  title,
  cta,
  ctaHref = "#",
  featured,
  items,
}: WbResearchProps) {
  return (
    <section className="mt-24 bg-wash py-20">
      <div className="mx-auto max-w-containerMaxW px-containerBase">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          cta={cta}
          ctaHref={ctaHref}
          className="mb-9"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <FeaturedCard featured={featured} />
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <CompactCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
