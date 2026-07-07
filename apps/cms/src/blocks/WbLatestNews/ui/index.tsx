import { Pill, SectionHeader } from "@/components/wb/primitives";

import type { WbLatestNewsFeatured, WbLatestNewsItem, WbLatestNewsProps } from "./types";

function FeaturedNews({ featured }: { featured: WbLatestNewsFeatured }) {
  return (
    <a
      href={featured.href ?? "#"}
      className="group flex flex-col no-underline transition-opacity hover:opacity-[0.92] lg:border-r lg:border-border lg:pr-10"
    >
      <div className="relative mb-5 h-[340px] overflow-hidden rounded-sm bg-[linear-gradient(135deg,#3a5a6d,#2a4250)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={featured.image} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="mb-3 flex items-center gap-3">
        <Pill variant="solid">{featured.category}</Pill>
        <span className="text-[13px] text-faint">{featured.date}</span>
      </div>
      <h3 className="m-0 mb-3 font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.015em] text-foreground">
        {featured.title}
      </h3>
      <p className="m-0 mb-6 max-w-[600px] text-[15.5px] leading-[1.6] text-muted-foreground">
        {featured.description}
      </p>
      <div className="flex items-center gap-3.5">
        <span className="text-[14px] font-semibold text-primary transition-colors group-hover:text-secondary">
          {featured.cta}
        </span>
        <span className="text-[13px] text-faint">{featured.byline}</span>
      </div>
    </a>
  );
}

function SupportingItem({ item }: { item: WbLatestNewsItem }) {
  return (
    <a
      href={item.href ?? "#"}
      className="flex flex-col gap-1.5 border-b border-border py-[18px] no-underline transition-opacity last:border-b-0 hover:opacity-70"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
          {item.category}
        </span>
        <span className="text-[11.5px] text-faint">{item.date}</span>
      </div>
      <div className="font-display text-[16px] font-medium leading-[1.3] text-foreground">
        {item.title}
      </div>
      <div className="text-[13px] leading-[1.45] text-muted-foreground">{item.text}</div>
    </a>
  );
}

export function WbLatestNews({ eyebrow, title, cta, ctaHref, featured, items }: WbLatestNewsProps) {
  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-[88px]">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        cta={cta}
        ctaHref={ctaHref}
        divider
        className="mb-9"
      />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr]">
        <FeaturedNews featured={featured} />
        <div className="flex flex-col">
          {items.map((item) => (
            <SupportingItem key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
